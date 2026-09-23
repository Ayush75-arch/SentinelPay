from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import RiskResult, Transaction
from ..schemas import LocationActivity, LocationResponse, LocationSummary
from .auth import get_authenticated_user

router = APIRouter(tags=["location"])


def _location_name(transaction: Transaction) -> str:
    if transaction.latitude is None or transaction.longitude is None:
        return "Unknown location"
    return f"{transaction.latitude:.2f}, {transaction.longitude:.2f}"


@router.get("/users/{user_id}/location-activity", response_model=LocationResponse)
def get_location_activity(
    user_id: str,
    db: Session = Depends(get_db),
    authenticated_user: str = Depends(get_authenticated_user),
):
    if user_id != authenticated_user:
        raise HTTPException(status_code=403, detail="cannot access another user")

    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.timestamp.desc())
        .all()
    )
    located = [transaction for transaction in transactions if transaction.latitude is not None and transaction.longitude is not None]
    counts = Counter(_location_name(transaction) for transaction in located)
    total = sum(counts.values()) or 1
    ranked = counts.most_common()
    locations = [
        LocationSummary(
            name=name,
            transactions=count,
            percentage=round(count * 100 / total),
            status="Primary location" if index == 0 else "Recent activity",
        )
        for index, (name, count) in enumerate(ranked)
    ]
    primary_name = ranked[0][0] if ranked else "Not available"
    primary_percentage = round(ranked[0][1] * 100 / total) if ranked else 0

    recent_activity = []
    for transaction in transactions[:5]:
        risk = db.query(RiskResult).filter(RiskResult.transaction_id == transaction.transaction_id).first()
        recent_activity.append(
            LocationActivity(
                merchant=transaction.merchant_name,
                location=_location_name(transaction),
                time=transaction.timestamp.strftime("%b %d, %I:%M %p"),
                amount=transaction.amount,
                status="Flagged" if risk and risk.risk_level in {"HIGH", "MEDIUM"} else "Normal",
            )
        )

    return LocationResponse(
        primary_location=primary_name,
        primary_percentage=primary_percentage,
        locations_observed=len(ranked),
        locations=locations,
        recent_activity=recent_activity,
    )