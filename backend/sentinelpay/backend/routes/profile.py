from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Transaction, User
from ..schemas import ProfileCategory, ProfileResponse
from .auth import get_authenticated_user

router = APIRouter(tags=["profile"])


def _hour_label(hour: int) -> str:
    suffix = "AM" if hour < 12 else "PM"
    display_hour = hour % 12 or 12
    return f"{display_hour}:00 {suffix}"


@router.get("/users/{user_id}/profile", response_model=ProfileResponse)
def get_profile(
    user_id: str,
    db: Session = Depends(get_db),
    authenticated_user: str = Depends(get_authenticated_user),
):
    if user_id != authenticated_user:
        raise HTTPException(status_code=403, detail="cannot access another user")
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="user not found")

    transactions = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    amounts = [transaction.amount for transaction in transactions]
    hours = [transaction.timestamp.hour for transaction in transactions]
    merchants = Counter(transaction.merchant_name for transaction in transactions)
    categories = Counter(transaction.category for transaction in transactions)
    locations = Counter(
        (round(transaction.latitude, 2), round(transaction.longitude, 2))
        for transaction in transactions
        if transaction.latitude is not None and transaction.longitude is not None
    )

    category_total = sum(categories.values()) or 1
    category_data = [
        ProfileCategory(name=name.replace("_", " ").title(), percentage=round(count * 100 / category_total))
        for name, count in categories.most_common()
    ]
    if not category_data:
        category_data = [ProfileCategory(name="No activity yet", percentage=0)]

    primary_location = "Not available"
    if locations:
        latitude, longitude = locations.most_common(1)[0][0]
        primary_location = f"{latitude:.2f}, {longitude:.2f}"

    return ProfileResponse(
        user_id=user.user_id,
        name=user.name,
        email=user.user_id,
        transaction_count=len(transactions),
        typical_transaction=(f"₹{min(amounts):,.0f} - ₹{max(amounts):,.0f}" if amounts else "No transactions yet"),
        usual_transaction_time=(f"{_hour_label(min(hours))} - {_hour_label(max(hours))}" if hours else "No transactions yet"),
        primary_location=primary_location,
        frequent_merchants=(", ".join(name for name, _ in merchants.most_common(3)) if merchants else "No merchants yet"),
        categories=category_data,
    )