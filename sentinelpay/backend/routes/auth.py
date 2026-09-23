import hashlib
import hmac
import base64
import json
import os
import secrets
import time
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import PasswordResetToken, User, UserCredential
from ..schemas import AuthLoginRequest, AuthRegisterRequest, AuthResponse, PasswordResetConfirmRequest, PasswordResetRequest

router = APIRouter(prefix="/auth", tags=["auth"])
SESSION_SECRET = os.getenv("SENTINELPAY_SESSION_SECRET", "development-only-change-me").encode()
SESSION_TTL_SECONDS = 60 * 60 * 24


def _create_token(user_id: str) -> str:
    payload = base64.urlsafe_b64encode(
        json.dumps({"user_id": user_id, "expires": int(time.time()) + SESSION_TTL_SECONDS}, separators=(",", ":")).encode()
    ).decode().rstrip("=")
    signature = hmac.new(SESSION_SECRET, payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{signature}"


def get_authenticated_user(authorization: str | None = Header(default=None)) -> str:
    user_id = get_authenticated_user_optional(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="authentication required")
    return user_id


def get_authenticated_user_optional(authorization: str | None = Header(default=None)) -> str | None:
    if not authorization:
        return None
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="invalid authorization header")
    try:
        payload, signature = authorization[7:].split(".", 1)
        expected = hmac.new(SESSION_SECRET, payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError
        decoded = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        if decoded["expires"] < time.time():
            raise ValueError
        return decoded["user_id"]
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        raise HTTPException(status_code=401, detail="invalid or expired session")


def _hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return f"{salt.hex()}:{digest.hex()}"


def _password_matches(password: str, stored: str) -> bool:
    try:
        salt_hex, digest_hex = stored.split(":", 1)
        expected = _hash_password(password, bytes.fromhex(salt_hex)).split(":", 1)[1]
        return hmac.compare_digest(expected, digest_hex)
    except (ValueError, TypeError):
        return False


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(body: AuthRegisterRequest, db: Session = Depends(get_db)):
    user_id = body.email.strip().lower()
    if db.query(User).filter(User.user_id == user_id).first():
        raise HTTPException(status_code=409, detail="account already exists")

    db.add(User(user_id=user_id, name=body.name.strip()))
    db.add(UserCredential(user_id=user_id, password_hash=_hash_password(body.password)))
    db.commit()
    return {"user_id": user_id, "name": body.name.strip(), "token": _create_token(user_id)}


@router.post("/login", response_model=AuthResponse)
def login(body: AuthLoginRequest, db: Session = Depends(get_db)):
    user_id = body.email.strip().lower()
    user = db.query(User).filter(User.user_id == user_id).first()
    credential = db.query(UserCredential).filter(UserCredential.user_id == user_id).first()
    if not user or not credential or not _password_matches(body.password, credential.password_hash):
        raise HTTPException(status_code=401, detail="invalid email or password")
    return {"user_id": user.user_id, "name": user.name, "token": _create_token(user.user_id)}


@router.post("/password-reset/request")
def request_password_reset(body: PasswordResetRequest, db: Session = Depends(get_db)):
    # Keep account existence private; email delivery can be attached here in production.
    user_id = body.email.strip().lower()
    user = db.query(User).filter(User.user_id == user_id).first()
    if user:
        token = secrets.token_urlsafe(32)
        db.add(PasswordResetToken(
            token=token,
            user_id=user_id,
            expires_at=datetime.utcnow() + timedelta(minutes=15),
        ))
        db.commit()
        print(f"PASSWORD RESET TOKEN for {user_id}: {token}")
    return {"message": "If an account exists for that email, reset instructions will be sent."}


@router.post("/password-reset/confirm")
def confirm_password_reset(body: PasswordResetConfirmRequest, db: Session = Depends(get_db)):
    reset = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == body.token,
        PasswordResetToken.used.is_(False),
    ).first()
    if not reset or reset.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="invalid or expired password reset token")
    credential = db.query(UserCredential).filter(UserCredential.user_id == reset.user_id).first()
    if not credential:
        raise HTTPException(status_code=400, detail="password reset is unavailable for this account")
    credential.password_hash = _hash_password(body.password)
    reset.used = True
    db.commit()
    return {"message": "password updated"}