import importlib.util
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import models
from .database import Base, engine
from .routes.transactions import router as transaction_router
from .routes.auth import router as auth_router
from .routes.profile import router as profile_router
from .routes.location import router as location_router
from .routes.summary import router as summary_router
from .services.transaction_service import model_state, train_behavioral_model
from sentinelpay.security.travel_mode import router as travel_mode_router

app = FastAPI(title="SentinelPay API", version="1.0.0")
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "SENTINELPAY_CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(transaction_router)
app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(location_router)
app.include_router(summary_router)
app.include_router(travel_mode_router)

# Rename sentinelpay/security/webauthn.py -> webauthn_service.py first
# (it currently shadows the installed `webauthn` pip package if that
# file is ever run standalone, e.g. `python webauthn.py` for testing).
if importlib.util.find_spec("webauthn") is not None:
    from sentinelpay.security.webauthn_service import router as webauthn_router
    app.include_router(webauthn_router)

# Only include this once websocket_alerts.py exists in security/ —
# it's the last piece from Person C's module list.
try:
    from sentinelpay.security.websocket_alerts import router as websocket_router
    app.include_router(websocket_router)
except ImportError:
    pass


@app.on_event("startup")
def startup() -> None:
    train_behavioral_model()


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "model_ready": model_state.ready,
        "model_error": model_state.error,
        "webauthn_enabled": importlib.util.find_spec("webauthn") is not None,
    }


@app.post("/model/train")
def train_model() -> dict:
    state = train_behavioral_model()
    return {"model_ready": state.ready, "model_error": state.error}
