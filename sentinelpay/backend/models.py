from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, LargeBinary, String

from .database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class UserCredential(Base):
    __tablename__ = "user_credentials"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.user_id"), unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String, unique=True, nullable=False, index=True)
    user_id = Column(String, index=True, nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, nullable=False)
    merchant_id = Column(String, nullable=False)
    merchant_name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    payment_method = Column(String, nullable=False)
    device_id = Column(String, nullable=True)
    is_recurring = Column(Boolean, default=False, nullable=False)
    travel_mode = Column(Boolean, default=False, nullable=False)


class RiskResult(Base):
    __tablename__ = "risk_results"
    id = Column(Integer, primary_key=True)
    transaction_id = Column(String, ForeignKey("transactions.transaction_id"), unique=True, nullable=False)
    behavioral_signals = Column(JSON, nullable=False)
    security_signals = Column(JSON, nullable=False)
    reasons = Column(JSON, nullable=False)
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)
    recommended_action = Column(String, nullable=False)


class TransactionReview(Base):
    __tablename__ = "transaction_reviews"
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String, ForeignKey("transactions.transaction_id"), unique=True, nullable=False, index=True)
    status = Column(String, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class WebAuthnCredential(Base):
    __tablename__ = "webauthn_credentials"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.user_id"), unique=True, nullable=False, index=True)
    credential_id = Column(LargeBinary, unique=True, nullable=False)
    public_key = Column(LargeBinary, nullable=False)
    sign_count = Column(Integer, nullable=False, default=0)
    rp_id = Column(String, nullable=False)


class WebAuthnVerificationGrant(Base):
    __tablename__ = "webauthn_verification_grants"
    token = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, nullable=False, default=False)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    token = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, nullable=False, default=False)
