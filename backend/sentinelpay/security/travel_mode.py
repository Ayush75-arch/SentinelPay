"""
Travel Mode.

Lets a user pre-authorize an upcoming travel window so the anomaly
engine loosens location sensitivity for that period. Every other check
(duplicate, velocity, impossible_travel, subscription) stays fully
active — travel mode narrows ONLY the location-anomaly tolerance that
Person A's ML model applies.

Enabling/disabling travel mode should require a verified WebAuthn
assertion (see webauthn.py) before the endpoints below are called —
that check belongs in the route handler in Person B's main FastAPI app,
e.g.:

    verify_authentication_response(...)   # webauthn.py
    if verified:
        enable_travel_mode(user_id, request)

This module intentionally does not perform that verification itself,
to keep it testable in isolation.
"""

from datetime import date, datetime
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sentinelpay.backend.routes.auth import get_authenticated_user

try:
    from sentinelpay.security.webauthn_service import consume_verification_grant
except ImportError:
    consume_verification_grant = None

router = APIRouter(prefix="/travel-mode", tags=["travel-mode"])

# In-memory store for the hackathon demo. Swap for a DB table
# (user_id, destination, start_date, end_date, enabled) once Person B's
# database is ready — the function signatures below won't need to change.
_travel_mode_store: Dict[str, Dict] = {}


class TravelModeRequest(BaseModel):
    destination: str
    start_date: date
    end_date: date


class TravelModeStatus(BaseModel):
    enabled: bool
    destination: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


def enable_travel_mode(user_id: str, request: TravelModeRequest) -> TravelModeStatus:
    if request.end_date < request.start_date:
        raise ValueError("end_date must be on or after start_date")
    _travel_mode_store[user_id] = {
        "destination": request.destination,
        "start_date": request.start_date,
        "end_date": request.end_date,
        "enabled": True,
    }
    return TravelModeStatus(**_travel_mode_store[user_id])


def disable_travel_mode(user_id: str) -> TravelModeStatus:
    _travel_mode_store.pop(user_id, None)
    return TravelModeStatus(enabled=False)


def get_travel_mode(user_id: str) -> TravelModeStatus:
    record = _travel_mode_store.get(user_id)
    if not record:
        return TravelModeStatus(enabled=False)
    return TravelModeStatus(**record)


def is_travel_mode_active(user_id: str, check_time: Optional[datetime] = None) -> bool:
    """
    Called by Person A's ML scoring code (or Person B's risk engine) to
    decide whether to loosen the location-anomaly threshold for this
    transaction. Automatically stops applying once end_date has passed —
    no separate cleanup job needed for the hackathon demo.
    """
    record = _travel_mode_store.get(user_id)
    if not record or not record["enabled"]:
        return False
    check_date = (check_time or datetime.utcnow()).date()
    return record["start_date"] <= check_date <= record["end_date"]


# --- FastAPI endpoints (include this router in Person B's main.py) ---

@router.post("/{user_id}", response_model=TravelModeStatus)
def api_enable_travel_mode(
    user_id: str,
    request: TravelModeRequest,
    webauthn_token: str = Query(...),
    authenticated_user: str = Depends(get_authenticated_user),
):
    if user_id != authenticated_user:
        raise HTTPException(status_code=403, detail="cannot modify another user")
    if consume_verification_grant is None or not consume_verification_grant(user_id, webauthn_token):
        raise HTTPException(status_code=401, detail="recent biometric verification required")
    try:
        return enable_travel_mode(user_id, request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/{user_id}", response_model=TravelModeStatus)
def api_get_travel_mode(user_id: str, authenticated_user: str = Depends(get_authenticated_user)):
    if user_id != authenticated_user:
        raise HTTPException(status_code=403, detail="cannot access another user")
    return get_travel_mode(user_id)


@router.delete("/{user_id}", response_model=TravelModeStatus)
def api_disable_travel_mode(
    user_id: str,
    webauthn_token: str = Query(...),
    authenticated_user: str = Depends(get_authenticated_user),
):
    if user_id != authenticated_user:
        raise HTTPException(status_code=403, detail="cannot modify another user")
    if consume_verification_grant is None or not consume_verification_grant(user_id, webauthn_token):
        raise HTTPException(status_code=401, detail="recent biometric verification required")
    return disable_travel_mode(user_id)


if __name__ == "__main__":
    req = TravelModeRequest(destination="Delhi", start_date=date(2026, 9, 25), end_date=date(2026, 9, 30))
    print(enable_travel_mode("user_1", req))
    print("Active on 2026-09-27:", is_travel_mode_active("user_1", datetime(2026, 9, 27)))
    print("Active on 2026-10-05:", is_travel_mode_active("user_1", datetime(2026, 10, 5)))
    print(disable_travel_mode("user_1"))