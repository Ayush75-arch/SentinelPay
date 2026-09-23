from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TransactionCreate(BaseModel):
    transaction_id: str = Field(min_length=1)
    user_id: str = Field(min_length=1)
    timestamp: datetime
    amount: float = Field(gt=0)
    currency: str = Field(min_length=3, max_length=3, default="INR")
    merchant_id: str = Field(min_length=1)
    merchant_name: str = Field(min_length=1)
    category: str = Field(min_length=1)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    payment_method: str = Field(min_length=1)
    device_id: str | None = None
    is_recurring: bool = False
    travel_mode: bool = False

    @field_validator("currency")
    @classmethod
    def uppercase_currency(cls, value: str) -> str:
        return value.upper()


class RiskResponse(BaseModel):
    behavioral_signals: dict[str, float]
    security_signals: dict[str, Any]
    reasons: list[str]
    risk_score: float = Field(ge=0, le=100)
    risk_level: str
    recommended_action: str


class TransactionResponse(BaseModel):
    transaction_id: str
    risk: RiskResponse


class DemoResponse(TransactionResponse):
    transaction: TransactionCreate


class TransactionRead(TransactionCreate):
    model_config = ConfigDict(from_attributes=True)


class TransactionDetail(TransactionRead):
    risk: RiskResponse | None = None
    review_status: str = "OPEN"


class ReviewRequest(BaseModel):
    status: Literal["APPROVED", "REJECTED"]


class AuthRegisterRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=8)
    name: str = Field(min_length=1, max_length=120)


class AuthLoginRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=1)


class PasswordResetRequest(BaseModel):
    email: str = Field(min_length=3)


class PasswordResetConfirmRequest(BaseModel):
    token: str = Field(min_length=1)
    password: str = Field(min_length=8)


class AuthResponse(BaseModel):
    user_id: str
    name: str
    token: str


class ProfileCategory(BaseModel):
    name: str
    percentage: int


class ProfileResponse(BaseModel):
    user_id: str
    name: str
    email: str
    transaction_count: int
    typical_transaction: str
    usual_transaction_time: str
    primary_location: str
    frequent_merchants: str
    categories: list[ProfileCategory]


class LocationSummary(BaseModel):
    name: str
    transactions: int
    percentage: int
    status: str


class LocationActivity(BaseModel):
    merchant: str
    location: str
    time: str
    amount: float
    status: str


class LocationResponse(BaseModel):
    primary_location: str
    primary_percentage: int
    locations_observed: int
    locations: list[LocationSummary]
    recent_activity: list[LocationActivity]


class SpendingDay(BaseModel):
    day: str
    amount: float
