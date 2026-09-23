from dataclasses import dataclass
from datetime import datetime, timedelta
import hashlib
from pathlib import Path
import pandas as pd
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from backendA.anomaly import BehavioralAnomalyModel
from backendA.baseline import build_user_baseline
from backendA.preprocessing import load_transactions
from backendA.scoring import score_transaction
from sentinelpay.security.security_engine import analyze
from sentinelpay.security.travel_mode import is_travel_mode_active
from ..models import RiskResult, Transaction
from ..schemas import TransactionCreate
from .risk_engine import calculate_risk

@dataclass
class ModelState:
    ready: bool = False
    error: str | None = None
    baseline: dict | None = None
    model: BehavioralAnomalyModel | None = None

model_state = ModelState()
BACKEND_ROOT = Path(__file__).resolve().parents[3]
TRAINING_PATH = BACKEND_ROOT / "backendA" / "data" / "train.csv"

def train_behavioral_model() -> ModelState:
    """Fit Person A's public pipeline; its labels are never used by fit or scoring."""
    try:
        train = load_transactions(TRAINING_PATH)
        baseline = build_user_baseline(train)
        model_state.baseline = baseline
        model_state.model = BehavioralAnomalyModel(random_state=42).fit(train, baseline)
        model_state.ready, model_state.error = True, None
    except Exception as exc:
        model_state.ready, model_state.error = False, str(exc)
        model_state.baseline, model_state.model = None, None
    return model_state

def _security_record(item: Transaction) -> dict:
    return {"id": item.transaction_id, "timestamp": item.timestamp, "amount": item.amount, "merchant": item.merchant_name, "latitude": item.latitude, "longitude": item.longitude}

def _behavioral_row(item: TransactionCreate | Transaction) -> dict:
    timestamp = item.timestamp
    return {"user_id": item.user_id, "timestamp": timestamp, "amount": item.amount, "currency": item.currency, "merchant": item.merchant_name, "category": item.category, "latitude": item.latitude, "longitude": item.longitude, "payment_method": item.payment_method, "is_recurring": item.is_recurring, "hour": timestamp.hour, "day_of_week": timestamp.weekday(), "day": timestamp.day, "date": timestamp.date()}

def _risk_dict(row: RiskResult) -> dict:
    return {"behavioral_signals": row.behavioral_signals, "security_signals": row.security_signals, "reasons": row.reasons, "risk_score": row.risk_score, "risk_level": row.risk_level, "recommended_action": row.recommended_action}


def _history_baseline(history: list[Transaction]) -> dict:
    if not history:
        return model_state.baseline or {}
    frame = pd.DataFrame([_behavioral_row(item) for item in history])
    baseline = build_user_baseline(frame)
    baseline["global"] = (model_state.baseline or {}).get("global", baseline.get("global", {}))
    return baseline


def _behavioral_reasons(signals: dict[str, float]) -> list[str]:
    labels = {
        "amount_anomaly": "Unusual transaction amount",
        "time_anomaly": "Transaction occurred at an unusual time",
        "location_anomaly": "Transaction occurred outside known locations",
        "merchant_anomaly": "Previously unseen merchant",
        "frequency_anomaly": "Unusual transaction frequency",
        "category_anomaly": "Unusual spending category",
    }
    return [label for key, label in labels.items() if signals.get(key, 0.0) >= 0.7]

def create_transaction(transaction: TransactionCreate, db: Session, behavioral_baseline: dict | None = None) -> tuple[Transaction, dict]:
    if db.query(Transaction).filter(Transaction.transaction_id == transaction.transaction_id).first():
        raise ValueError("duplicate_transaction_id")
    history = db.query(Transaction).filter(Transaction.user_id == transaction.user_id, Transaction.timestamp <= transaction.timestamp).order_by(Transaction.timestamp.asc()).all()
    incoming = {"id": transaction.transaction_id, "timestamp": transaction.timestamp, "amount": transaction.amount, "merchant": transaction.merchant_name, "latitude": transaction.latitude, "longitude": transaction.longitude}
    security_history = [_security_record(item) for item in history]
    security = analyze(
        incoming,
        security_history,
        _security_record(history[-1]) if history else None,
        transaction_history=security_history,
        # The client cannot disable risk checks by sending a flag. Apply only
        # a currently active, server-side Travel Mode record for this user.
        travel_mode=is_travel_mode_active(transaction.user_id, transaction.timestamp),
    )
    behavioral = {"personal_anomaly": 0.0}
    if model_state.ready and model_state.baseline and model_state.model:
        baseline = behavioral_baseline or _history_baseline(history)
        behavioral = score_transaction(pd.Series(_behavioral_row(transaction)), baseline, model_state.model, pd.DataFrame([_behavioral_row(item) for item in history]))
    reasons = list(security["security_reasons"]) + _behavioral_reasons(behavioral)
    if behavioral.get("personal_anomaly", 0) >= .70:
        reasons.append("Behavior is materially different from this user's baseline")
    signal_values = [behavioral.get(name, 0.0) for name in ("amount_anomaly", "time_anomaly", "location_anomaly", "merchant_anomaly", "frequency_anomaly", "category_anomaly")]
    behavioral_score = max(behavioral.get("personal_anomaly", 0.0), max(signal_values, default=0.0))
    aggregate = calculate_risk(behavioral_score, security["score"], reasons)
    action = "ALLOW" if aggregate["risk_level"] == "LOW" else "REVIEW"
    if aggregate["risk_level"] == "HIGH":
        try:
            from sentinelpay.security.webauthn_service import has_registered_credential
            if has_registered_credential(transaction.user_id): action = "REQUIRE_CONFIRMATION"
        except ImportError: pass
    entity = Transaction(**transaction.model_dump())
    risk = {"behavioral_signals": {key: round(float(value), 4) for key, value in behavioral.items()}, "security_signals": security, "reasons": reasons, **aggregate, "recommended_action": action}
    try:
        db.add(entity); db.flush(); db.add(RiskResult(transaction_id=entity.transaction_id, **risk)); db.commit(); db.refresh(entity)
    except IntegrityError:
        db.rollback(); raise ValueError("duplicate_transaction_id")
    return entity, risk

def get_transaction(transaction_id: str, db: Session) -> tuple[Transaction | None, dict | None]:
    transaction = db.query(Transaction).filter(Transaction.transaction_id == transaction_id).first()
    result = db.query(RiskResult).filter(RiskResult.transaction_id == transaction_id).first() if transaction else None
    return transaction, _risk_dict(result) if result else None


def seed_demo_transactions(user_id: str, db: Session) -> list[tuple[Transaction, dict]]:
    """Create a small, idempotent demo history through the normal risk flow."""
    user_key = hashlib.sha1(user_id.encode("utf-8")).hexdigest()[:10]
    now = datetime(2026, 9, 23, 12, 0)
    examples = [
        ("Campus Cafe", "food", 160.0, 5, False),
        ("Campus Cafe", "food", 200.0, 4, False),
        ("Metro", "transport", 80.0, 3, False),
        ("Campus Cafe", "food", 180.0, 2, False),
        ("StreamFlix", "entertainment", 299.0, 1, True),
        ("StreamFlix", "entertainment", 299.0, 15, True),
        ("StreamFlix", "entertainment", 299.0, 29, True),
    ]
    payloads = [
        TransactionCreate(
            transaction_id=f"demo-{user_key}-{index}",
            user_id=user_id,
            timestamp=now - timedelta(days=days_ago),
            amount=amount,
            currency="INR",
            merchant_id=f"demo-{index}",
            merchant_name=merchant,
            category=category,
            latitude=12.9716,
            longitude=77.5946,
            payment_method="card",
            device_id="demo-device",
            is_recurring=is_recurring,
        )
        for index, (merchant, category, amount, days_ago, is_recurring) in enumerate(examples)
    ]
    demo_baseline = build_user_baseline(pd.DataFrame([_behavioral_row(item) for item in payloads]))
    results = []
    for payload in payloads:
        transaction_id = payload.transaction_id
        existing, risk = get_transaction(transaction_id, db)
        if existing and risk:
            results.append((existing, risk))
            continue
        results.append(create_transaction(payload, db, behavioral_baseline=demo_baseline))
    return results


SCENARIO_OFFSETS = {
    "normal": 1,
    "location-anomaly": 3,
    "amount-anomaly": 5,
    "time-anomaly": 7,
    "merchant-anomaly": 9,
    "shadow-subscription": 11,
    "multi-signal": 13,
}


def run_demo_scenario(user_id: str, scenario: str, db: Session) -> tuple[Transaction, dict]:
    if scenario not in SCENARIO_OFFSETS:
        raise ValueError("unknown_demo_scenario")
    seed_demo_transactions(user_id, db)
    base = datetime(2026, 9, 23, 12, 0)
    offset = SCENARIO_OFFSETS[scenario]
    values = {
        "merchant_name": "Campus Cafe",
        "category": "food",
        "amount": 180.0,
        "timestamp": base + timedelta(days=offset, hours=1),
        "latitude": 12.9716,
        "longitude": 77.5946,
        "is_recurring": False,
    }
    if scenario == "location-anomaly":
        values.update(latitude=28.6139, longitude=77.2090)
    elif scenario == "amount-anomaly":
        values.update(amount=2500.0)
    elif scenario == "time-anomaly":
        values.update(timestamp=base.replace(hour=3) + timedelta(days=offset))
    elif scenario == "merchant-anomaly":
        values.update(merchant_name="Unknown Luxury Outlet", category="shopping", amount=900.0)
    elif scenario == "shadow-subscription":
        values.update(merchant_name="StreamFlix", category="entertainment", amount=299.0, is_recurring=True)
    elif scenario == "multi-signal":
        values.update(merchant_name="Unknown Luxury Outlet", category="shopping", amount=2500.0, latitude=28.6139, longitude=77.2090, timestamp=base.replace(hour=3) + timedelta(days=offset))
    transaction_id = f"demo-{hashlib.sha1(user_id.encode('utf-8')).hexdigest()[:10]}-{scenario}"
    existing, risk = get_transaction(transaction_id, db)
    if existing and risk:
        return existing, risk
    payload = TransactionCreate(
        transaction_id=transaction_id,
        user_id=user_id,
        merchant_id=f"demo-{scenario}",
        payment_method="card",
        device_id="demo-device",
        currency="INR",
        **values,
    )
    return create_transaction(payload, db)
