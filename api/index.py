"""Single-project Vercel entrypoint for the SentinelPay FastAPI app."""

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1] / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sentinelpay.backend.main import app  # noqa: E402

__all__ = ["app"]
