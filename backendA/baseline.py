"""Personal behavioral baselines fitted exclusively from training data."""

from typing import Any

import numpy as np
import pandas as pd

try:
    from .location import fit_location_clusters
except ImportError:
    from location import fit_location_clusters


def _distribution(values: pd.Series) -> dict[str, int]:
    return {str(key): int(value) for key, value in values.value_counts(dropna=False).items()}


def _amount_stats(values: pd.Series) -> dict[str, float]:
    numeric = pd.to_numeric(values, errors="coerce").fillna(0.0)
    return {"mean": float(numeric.mean()), "std": float(numeric.std(ddof=0)), "median": float(numeric.median()), "lower": float(numeric.quantile(0.05)), "upper": float(numeric.quantile(0.95)), "count": int(numeric.size)}


def build_user_baseline(train_df: pd.DataFrame) -> dict[str, Any]:
    """Build user profiles; callers must pass training data only."""
    if train_df.empty:
        return {"users": {}, "global": {"amount": _amount_stats(pd.Series(dtype=float)), "daily_mean": 0.0, "daily_std": 1.0}, "locations": {}}
    users: dict[str, Any] = {}
    for user_id, user_frame in train_df.groupby("user_id"):
        category_amounts = {str(category): _amount_stats(group["amount"]) for category, group in user_frame.groupby("category") if len(group) >= 3}
        daily_counts = user_frame.groupby("date").size().astype(float)
        hour_counts = user_frame["hour"].value_counts().reindex(range(24), fill_value=0)
        users[str(user_id)] = {
            "amount": _amount_stats(user_frame["amount"]),
            "category_amount": category_amounts,
            "time": {"hour_distribution": {str(hour): int(count) for hour, count in hour_counts.items()}, "active_hours": [int(hour) for hour, count in hour_counts.items() if count > 0], "average_hour": float(np.average(hour_counts.index, weights=hour_counts.to_numpy())) if hour_counts.sum() else 12.0, "day_of_week_distribution": _distribution(user_frame["day_of_week"])},
            "merchants": _distribution(user_frame["merchant"]),
            "categories": _distribution(user_frame["category"]),
            "frequency": {"daily_mean": float(daily_counts.mean()) if len(daily_counts) else 0.0, "daily_std": float(daily_counts.std(ddof=0)) if len(daily_counts) else 1.0, "daily_counts": {str(key): int(value) for key, value in daily_counts.items()}},
        }
    daily = train_df.groupby(["user_id", "date"]).size()
    return {"users": users, "global": {"amount": _amount_stats(train_df["amount"]), "daily_mean": float(daily.mean()), "daily_std": float(daily.std(ddof=0) or 1.0)}, "locations": fit_location_clusters(train_df)}


def get_user_baseline(baseline: dict[str, Any], user_id: str) -> dict[str, Any]:
    """Get a user's profile, with a conservative global fallback."""
    if user_id in baseline.get("users", {}):
        return baseline["users"][user_id]
    global_amount = baseline.get("global", {}).get("amount", _amount_stats(pd.Series(dtype=float)))
    return {"amount": global_amount, "category_amount": {}, "time": {"hour_distribution": {}, "active_hours": list(range(24)), "average_hour": 12.0, "day_of_week_distribution": {}}, "merchants": {}, "categories": {}, "frequency": {"daily_mean": baseline.get("global", {}).get("daily_mean", 0.0), "daily_std": baseline.get("global", {}).get("daily_std", 1.0), "daily_counts": {}}}