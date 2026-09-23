"""Vercel entrypoint for the SentinelPay FastAPI application."""

from sentinelpay.backend.main import app

__all__ = ["app"]
