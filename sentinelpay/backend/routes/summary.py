from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Transaction
from ..schemas import SpendingDay
from .auth import get_authenticated_user

router = APIRouter(tags=["summary"])


@router.get("/users/{user_id}/spending-summary", response_model=list[SpendingDay])
def spending_summary(
    user_id: str,
    db: Session = Depends(get_db),
    authenticated_user: str = Depends(get_authenticated_user),
):
    if user_id != authenticated_user:
        raise HTTPException(status_code=403, detail="cannot access another user")
    today = datetime.utcnow().date()
    start = today - timedelta(days=6)
    totals = {start + timedelta(days=offset): 0.0 for offset in range(7)}
    transactions = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    for transaction in transactions:
        transaction_date = transaction.timestamp.date()
        if transaction_date in totals:
            totals[transaction_date] += transaction.amount
    return [
        {"day": day.strftime("%a"), "amount": round(totals[day], 2)}
        for day in sorted(totals)
    ]