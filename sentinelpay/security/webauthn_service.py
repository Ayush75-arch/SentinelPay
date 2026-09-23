"""
WebAuthn — biometric confirmation (Face ID / Touch ID / Windows Hello /
platform fingerprint) for high-risk alert responses and for enabling
Travel Mode.

Built on the `py_webauthn` library (pip install webauthn). The browser
and OS handle the actual biometric capture — this module never sees or
stores a fingerprint or face scan, only a cryptographic public key and
signed assertions.

Flow:
    1. POST /webauthn/register/options   -> browser calls navigator.credentials.create()
    2. POST /webauthn/register/verify    -> store the returned public key
    3. POST /webauthn/authenticate/options -> browser calls navigator.credentials.get()
    4. POST /webauthn/authenticate/verify  -> confirms it's really the user's device
"""

import secrets
import time
from datetime import datetime, timedelta
from typing import Dict, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
)
from webauthn.helpers.structs import (
    PublicKeyCredentialDescriptor,
    AuthenticatorSelectionCriteria,
    UserVerificationRequirement,
)
from webauthn.helpers import base64url_to_bytes
from sentinelpay.backend.routes.auth import _create_token
from sentinelpay.backend.database import SessionLocal
from sentinelpay.backend.models import WebAuthnCredential, WebAuthnVerificationGrant

router = APIRouter(prefix="/webauthn", tags=["webauthn"])

# Change these to match your actual demo domain before testing on a real
# device. localhost works for RP_ID during local hackathon development;
# a real deployed domain must match exactly (no scheme, no port).
RP_NAME = "SentinelPay"
SUPPORTED_ORIGINS = {
    "http://localhost:5173": "localhost",
    "http://127.0.0.1:5173": "127.0.0.1",
}

# In-memory stores for the hackathon demo — swap for real DB tables.
# _credentials: user_id -> {credential_id, public_key, sign_count}
# _pending_challenges: user_id -> last issued challenge bytes
_pending_challenges: Dict[str, Dict] = {}


def _origin_config(request: Request) -> tuple[str, str]:
    origin = request.headers.get("origin", "http://localhost:5173")
    if origin not in SUPPORTED_ORIGINS:
        raise HTTPException(status_code=400, detail="unsupported frontend origin")
    return origin, SUPPORTED_ORIGINS[origin]


class VerifyRegistrationRequest(BaseModel):
    user_id: str
    credential: dict  # raw JSON response from navigator.credentials.create()


class VerifyAuthenticationRequest(BaseModel):
    user_id: str
    credential: dict  # raw JSON response from navigator.credentials.get()


@router.post("/register/options")
def register_options(user_id: str, request: Request):
    origin, rp_id = _origin_config(request)
    options = generate_registration_options(
        rp_id=rp_id,
        rp_name=RP_NAME,
        user_id=user_id.encode("utf-8"),
        user_name=user_id,
        authenticator_selection=AuthenticatorSelectionCriteria(
            user_verification=UserVerificationRequirement.REQUIRED,  # forces biometric/PIN, not just "device present"
        ),
    )
    _pending_challenges[user_id] = {"challenge": options.challenge, "origin": origin, "rp_id": rp_id}
    return options_to_json(options)


@router.post("/register/verify")
def register_verify(body: VerifyRegistrationRequest):
    pending = _pending_challenges.get(body.user_id)
    if not pending:
        raise HTTPException(status_code=400, detail="No pending registration challenge for this user")

    try:
        verification = verify_registration_response(
            credential=body.credential,
            expected_challenge=pending["challenge"],
            expected_origin=pending["origin"],
            expected_rp_id=pending["rp_id"],
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Registration verification failed: {exc}")

    db = SessionLocal()
    try:
        credential = db.query(WebAuthnCredential).filter(WebAuthnCredential.user_id == body.user_id).first()
        if credential:
            credential.credential_id = verification.credential_id
            credential.public_key = verification.credential_public_key
            credential.sign_count = verification.sign_count
            credential.rp_id = pending["rp_id"]
        else:
            db.add(WebAuthnCredential(
                user_id=body.user_id,
                credential_id=verification.credential_id,
                public_key=verification.credential_public_key,
                sign_count=verification.sign_count,
                rp_id=pending["rp_id"],
            ))
        db.commit()
    finally:
        db.close()
    _pending_challenges.pop(body.user_id, None)
    return {"verified": True, "token": _create_token(body.user_id)}


@router.post("/authenticate/options")
def authenticate_options(user_id: str, request: Request):
    db = SessionLocal()
    try:
        record = db.query(WebAuthnCredential).filter(WebAuthnCredential.user_id == user_id).first()
    finally:
        db.close()
    if not record:
        raise HTTPException(status_code=404, detail="No registered credential for this user")

    origin, rp_id = _origin_config(request)
    options = generate_authentication_options(
        rp_id=record.rp_id or rp_id,
        allow_credentials=[PublicKeyCredentialDescriptor(id=record.credential_id)],
        user_verification=UserVerificationRequirement.REQUIRED,
    )
    _pending_challenges[user_id] = {"challenge": options.challenge, "origin": origin, "rp_id": record.rp_id or rp_id}
    return options_to_json(options)


@router.post("/authenticate/verify")
def authenticate_verify(body: VerifyAuthenticationRequest):
    db = SessionLocal()
    record = db.query(WebAuthnCredential).filter(WebAuthnCredential.user_id == body.user_id).first()
    pending = _pending_challenges.get(body.user_id)
    if not record or not pending:
        db.close()
        raise HTTPException(status_code=400, detail="No pending authentication for this user")

    try:
        verification = verify_authentication_response(
            credential=body.credential,
            expected_challenge=pending["challenge"],
            expected_origin=pending["origin"],
            expected_rp_id=pending["rp_id"],
            credential_public_key=record.public_key,
            credential_current_sign_count=record.sign_count,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Authentication verification failed: {exc}")

    record.sign_count = verification.new_sign_count
    _pending_challenges.pop(body.user_id, None)
    grant = secrets.token_urlsafe(32)
    db.add(WebAuthnVerificationGrant(
        token=grant,
        user_id=body.user_id,
        expires_at=datetime.utcnow() + timedelta(seconds=120),
    ))
    db.commit()
    db.close()
    return {
        "verified": True,
        "token": _create_token(body.user_id),
        "verification_token": grant,
    }


def consume_verification_grant(user_id: str, token: str) -> bool:
    db = SessionLocal()
    try:
        grant = db.query(WebAuthnVerificationGrant).filter(
            WebAuthnVerificationGrant.token == token,
            WebAuthnVerificationGrant.user_id == user_id,
            WebAuthnVerificationGrant.used.is_(False),
        ).first()
        if not grant or grant.expires_at < datetime.utcnow():
            return False
        grant.used = True
        db.commit()
        return True
    finally:
        db.close()


def has_registered_credential(user_id: str) -> bool:
    """
    Quick check other modules (or the frontend, via a status endpoint)
    can use to know whether a user has completed WebAuthn registration
    yet at all — e.g. to decide whether to show a "set up biometric
    confirmation" prompt before their first high-risk alert fires.
    """
    db = SessionLocal()
    try:
        return db.query(WebAuthnCredential).filter(WebAuthnCredential.user_id == user_id).first() is not None
    finally:
        db.close()


if __name__ == "__main__":
    # WebAuthn's create()/get() calls require an actual browser + platform
    # authenticator (Face ID, Touch ID, Windows Hello, etc.), so this
    # module can't be smoke-tested headlessly like the others. To test:
    #   1. pip install fastapi uvicorn webauthn
    #   2. Mount `router` in a FastAPI app, run with uvicorn
    #   3. Serve your frontend over http://localhost (matching ORIGIN above)
    #   4. Call /webauthn/register/options, feed the result into
    #      navigator.credentials.create() in the browser, POST the result
    #      to /webauthn/register/verify
    print("Run this behind a FastAPI app and test from an actual browser — see comments above.")