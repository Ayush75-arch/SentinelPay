from datetime import datetime, timedelta

from sentinelpay.backend.services.risk_engine import calculate_risk
from sentinelpay.security.impossible_travel import check_impossible_travel
from sentinelpay.security.security_engine import analyze


def tx(identifier: str, timestamp: datetime, **overrides):
    value = {"id": identifier, "timestamp": timestamp, "amount": 100.0, "merchant": "Store", "latitude": 12.9716, "longitude": 77.5946}
    value.update(overrides)
    return value


def test_score_units_and_thresholds():
    assert calculate_risk(1, 1)["risk_score"] == 100
    assert calculate_risk(0, 0)["risk_level"] == "LOW"
    assert calculate_risk(.7, .7)["risk_level"] == "HIGH"


def test_duplicate_velocity_and_travel_mode():
    now = datetime(2026, 9, 1, 12)
    history = [tx(f"p{i}", now - timedelta(seconds=20 * (i + 1))) for i in range(4)]
    result = analyze(tx("new", now), history, history[0])
    assert result["duplicate"]["duplicate"]
    assert result["velocity"]["high_velocity"]
    far = tx("far", now, latitude=28.6139, longitude=77.2090)
    travel = analyze(far, [history[-1]], tx("old", now - timedelta(hours=1)))
    relaxed = analyze(far, [history[-1]], tx("old", now - timedelta(hours=1)), travel_mode=True)
    assert travel["impossible_travel"]["impossible_travel"]
    assert relaxed["contributions"]["impossible_travel"] == 0


def test_missing_location_is_safe():
    now = datetime.now()
    assert not check_impossible_travel(tx("a", now, latitude=None, longitude=None), tx("b", now - timedelta(hours=1)))["impossible_travel"]


def test_api_persists_and_rejects_duplicate_id():
    from fastapi.testclient import TestClient
    from sentinelpay.backend.main import app
    from sentinelpay.backend.services.transaction_service import train_behavioral_model
    train_behavioral_model()
    request = {"transaction_id": "api-persist-1", "user_id": "api-user", "timestamp": "2026-09-01T09:00:00", "amount": 100, "currency": "inr", "merchant_id": "merchant-1", "merchant_name": "Store", "category": "groceries", "payment_method": "card"}
    with TestClient(app) as client:
        created = client.post("/transactions", json=request)
        assert created.status_code == 201
        body = created.json()
        assert body["risk"]["risk_score"] <= 100
        assert body["risk"]["behavioral_signals"]["personal_anomaly"] <= 1
        assert client.get("/transactions/api-persist-1").status_code == 200
        assert client.get("/users/api-user/transactions").status_code == 200
        assert client.post("/transactions", json=request).status_code == 409
