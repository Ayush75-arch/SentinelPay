"""Personalized contextual behavioral features."""

from typing import Any

import numpy as np
import pandas as pd

try:
    from .baseline import get_user_baseline
    from .location import calculate_location_distance
except ImportError:
    from baseline import get_user_baseline
    from location import calculate_location_distance


FEATURE_COLUMNS = [
    "amount_deviation", "time_deviation", "location_distance",
    "merchant_novelty", "category_deviation", "transaction_frequency",
]


def _clip_score(value: float) -> float:
    return float(np.clip(0.0 if not np.isfinite(value) else value, 0.0, 1.0))


def _amount_deviation(row: pd.Series, profile: dict[str, Any]) -> float:
    stats = profile.get("category_amount", {}).get(str(row.get("category")), profile.get("amount", {}))
    mean = float(stats.get("mean", 0.0))
    scale = max(float(stats.get("std", 0.0)), abs(mean) * 0.05, 1.0)
    return _clip_score(abs(float(row.get("amount", 0.0)) - mean) / (4.0 * scale))


def _time_deviation(row: pd.Series, profile: dict[str, Any]) -> float:
    time_profile = profile.get("time", {})
    hour = int(row.get("hour", 0))
    active_hours = time_profile.get("active_hours", list(range(24)))
    if not active_hours:
        return 0.5
    nearest = min(abs(hour - int(active)) for active in active_hours)
    circular = min(nearest, 24 - nearest)
    return _clip_score(circular / 8.0)


def _category_deviation(row: pd.Series, profile: dict[str, Any]) -> float:
    counts = profile.get("categories", {})
    total = sum(counts.values())
    if not counts or total <= 0:
        return 0.5
    share = counts.get(str(row.get("category")), 0) / total
    return _clip_score(1.0 - (share / max(max(counts.values()) / total, 1e-12)))


def _frequency_deviation(row: pd.Series, profile: dict[str, Any], seen_daily_counts: dict[tuple[str, Any], int]) -> float:
    user_id = str(row.get("user_id"))
    date = row.get("date")
    current_count = seen_daily_counts.get((user_id, date), 0) + 1
    frequency = profile.get("frequency", {})
    mean = float(frequency.get("daily_mean", 0.0))
    scale = max(float(frequency.get("daily_std", 0.0)), 1.0)
    if mean <= 0:
        return 0.0
    return _clip_score(max(0.0, current_count - mean) / (4.0 * scale))


def generate_features(
    transactions: pd.DataFrame,
    baseline: dict[str, Any],
    history: pd.DataFrame | None = None,
) -> pd.DataFrame:
    """Generate features in input order, using only preceding history for frequency."""
    result = transactions.copy()
    if result.empty:
        return pd.DataFrame(columns=FEATURE_COLUMNS, index=result.index)
    seen: dict[tuple[str, Any], int] = {}
    if history is not None and not history.empty:
        for row in history.sort_values("timestamp").itertuples(index=False):
            key = (str(row.user_id), row.date)
            seen[key] = seen.get(key, 0) + 1
    output = []
    location_profiles = baseline.get("locations", {})
    for index, row in result.sort_values("timestamp").iterrows():
        user_id = str(row.get("user_id"))
        profile = get_user_baseline(baseline, user_id)
        merchant_counts = profile.get("merchants", {})
        category_counts = profile.get("categories", {})
        merchant_novelty = 1.0 if str(row.get("merchant")) not in merchant_counts else _clip_score(1.0 / max(merchant_counts[str(row.get("merchant"))], 1))
        location_distance = calculate_location_distance(row, location_profiles.get(user_id, {}))
        if not np.isfinite(location_distance):
            location_distance = 0.0
        values = {
            "amount_deviation": _amount_deviation(row, profile),
            "time_deviation": _time_deviation(row, profile),
            "location_distance": float(max(0.0, location_distance)),
            "merchant_novelty": merchant_novelty,
            "category_deviation": _category_deviation(row, profile),
            "transaction_frequency": _frequency_deviation(row, profile, seen),
        }
        output.append((index, values))
        key = (user_id, row.get("date"))
        seen[key] = seen.get(key, 0) + 1
    feature_frame = pd.DataFrame({index: values for index, values in output}).T
    feature_frame = feature_frame.reindex(result.index).fillna(0.0)
    return feature_frame[FEATURE_COLUMNS].astype(float)