from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Transaction, TransactionReview
from ..schemas import DemoResponse, ReviewRequest, TransactionCreate, TransactionDetail, TransactionResponse
from ..services.transaction_service import create_transaction, get_transaction, run_demo_scenario, seed_demo_transactions
from .auth import get_authenticated_user, get_authenticated_user_optional

router = APIRouter(tags=["transactions"])

@router.post("/transactions", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def post_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):
    try: entity, risk = create_transaction(transaction, db)
    except ValueError as exc:
        if str(exc) == "duplicate_transaction_id": raise HTTPException(status_code=409, detail="transaction_id already exists")
        raise
    return {"transaction_id": entity.transaction_id, "risk": risk}

@router.get("/transactions/{transaction_id}", response_model=TransactionDetail)
def read_transaction(transaction_id: str, db: Session = Depends(get_db)):
    transaction, risk = get_transaction(transaction_id, db)
    if not transaction: raise HTTPException(status_code=404, detail="transaction not found")
    review = db.query(TransactionReview).filter(TransactionReview.transaction_id == transaction_id).first()
    return {**TransactionDetail.model_validate(transaction).model_dump(), "risk": risk, "review_status": review.status if review else "OPEN"}

@router.get("/users/{user_id}/transactions", response_model=list[TransactionDetail])
def user_transactions(user_id: str, db: Session = Depends(get_db), authenticated_user: str | None = Depends(get_authenticated_user_optional)):
    if authenticated_user and user_id != authenticated_user:
        raise HTTPException(status_code=403, detail="cannot access another user")
    records = db.query(Transaction).filter(Transaction.user_id == user_id).order_by(Transaction.timestamp.asc()).all()
    return [
        {
            **TransactionDetail.model_validate(item).model_dump(),
            "risk": get_transaction(item.transaction_id, db)[1],
            "review_status": (db.query(TransactionReview).filter(TransactionReview.transaction_id == item.transaction_id).first() or TransactionReview(status="OPEN")).status,
        }
        for item in records
    ]


@router.post("/transactions/{transaction_id}/review")
def review_transaction(
    transaction_id: str,
    body: ReviewRequest,
    db: Session = Depends(get_db),
    authenticated_user: str = Depends(get_authenticated_user),
):
    transaction = db.query(Transaction).filter(Transaction.transaction_id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="transaction not found")
    if transaction.user_id != authenticated_user:
        raise HTTPException(status_code=403, detail="cannot review another user")
    review = db.query(TransactionReview).filter(TransactionReview.transaction_id == transaction_id).first()
    if review:
        review.status = body.status
    else:
        review = TransactionReview(transaction_id=transaction_id, status=body.status)
        db.add(review)
    db.commit()
    return {"transaction_id": transaction_id, "status": body.status}


@router.post("/demo/users/{user_id}/transactions", response_model=list[TransactionResponse])
def seed_demo_user_transactions(user_id: str, db: Session = Depends(get_db), authenticated_user: str | None = Depends(get_authenticated_user_optional)):
    """Development/demo helper; records are created through normal scoring."""
    if authenticated_user and user_id != authenticated_user:
        raise HTTPException(status_code=403, detail="cannot access another user")
    return [{"transaction_id": item.transaction_id, "risk": risk} for item, risk in seed_demo_transactions(user_id, db)]


@router.post("/demo/users/{user_id}/scenario/{scenario}", response_model=DemoResponse)
def demo_scenario(user_id: str, scenario: str, db: Session = Depends(get_db), authenticated_user: str | None = Depends(get_authenticated_user_optional)):
    """Run one deterministic judge-facing scenario through normal risk fusion."""
    if authenticated_user and user_id != authenticated_user:
        raise HTTPException(status_code=403, detail="cannot access another user")
    try:
        entity, risk = run_demo_scenario(user_id, scenario, db)
    except ValueError as exc:
        if str(exc) == "unknown_demo_scenario":
            raise HTTPException(status_code=404, detail="unknown demo scenario") from exc
        raise
    return {"transaction_id": entity.transaction_id, "transaction": entity, "risk": risk}
