"""Deterministic transaction loading and preprocessing utilities."""

from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd


REQUIRED_COLUMNS = [
    "transaction_id", "user_id", "timestamp", "amount", "currency",
    "transaction_type", "merchant", "category", "latitude", "longitude",
    "payment_method", "is_recurring", "status", "is_anomaly", "anomaly_type",
]


def load_transactions(path: str | Path) -> pd.DataFrame:
    """Load and preprocess one transaction CSV without dropping rows."""
    frame = pd.read_csv(path)
    validate_schema(frame)
    return preprocess_transactions(frame)


def validate_schema(frame: pd.DataFrame, required: Iterable[str] = REQUIRED_COLUMNS) -> None:
    """Raise a useful error when the input does not contain the expected fields."""
    missing = [column for column in required if column not in frame.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")


def _normalise_bool(value: object) -> bool:
    if pd.isna(value):
        return False
    if isinstance(value, (bool, np.bool_)):
        return bool(value)
    return str(value).strip().lower() in {"1", "true", "yes", "y", "t"}


def preprocess_transactions(frame: pd.DataFrame) -> pd.DataFrame:
    """Parse timestamps, normalise categorical values, and add temporal fields."""
    validate_schema(frame)
    result = frame.copy()
    result["timestamp"] = pd.to_datetime(result["timestamp"], errors="coerce")
    for column in ["user_id", "merchant", "category", "currency", "transaction_type", "payment_method", "status"]:
        result[column] = result[column].fillna("UNKNOWN").astype(str).str.strip()
    result["amount"] = pd.to_numeric(result["amount"], errors="coerce").fillna(0.0).clip(lower=0.0)
    result["latitude"] = pd.to_numeric(result["latitude"], errors="coerce")
    result["longitude"] = pd.to_numeric(result["longitude"], errors="coerce")
    result["is_recurring"] = result["is_recurring"].map(_normalise_bool)
    result["hour"] = result["timestamp"].dt.hour.fillna(0).astype(int)
    result["day_of_week"] = result["timestamp"].dt.dayofweek.fillna(-1).astype(int)
    result["day"] = result["timestamp"].dt.day.fillna(0).astype(int)
    result["date"] = result["timestamp"].dt.date
    return result