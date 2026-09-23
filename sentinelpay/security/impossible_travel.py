"""
Impossible-travel detection.

Flags a transaction when the implied speed of travel between it and the
user's immediately preceding transaction location exceeds what's
physically plausible.
"""

import math
from datetime import datetime
from typing import Dict, Any, Optional

EARTH_RADIUS_KM = 6371.0
IMPLAUSIBLE_SPEED_KMH = 900  # ~commercial flight speed; faster than this is impossible without one
MIN_ELAPSED_SECONDS = 30  # avoid noisy divide-by-near-zero on rapid legitimate retries at one terminal


def _parse_ts(ts) -> datetime:
    if isinstance(ts, datetime):
        return ts
    return datetime.fromisoformat(ts)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    lat1_r, lon1_r, lat2_r, lon2_r = map(math.radians, (lat1, lon1, lat2, lon2))
    dlat = lat2_r - lat1_r
    dlon = lon2_r - lon1_r
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return EARTH_RADIUS_KM * c


def check_impossible_travel(
    transaction: Dict[str, Any],
    previous_transaction: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Compare `transaction` to the user's immediately preceding transaction
    and flag if the implied travel speed between the two locations is
    physically implausible.

    Args:
        transaction: incoming transaction with timestamp, latitude, longitude.
        previous_transaction: the user's most recent prior transaction, same
            shape, or None if this is their first recorded transaction.

    Returns:
        {
            "impossible_travel": bool,
            "implied_speed_kmh": float | None,
            "reason": str | None
        }
    """
    if previous_transaction is None:
        return {"impossible_travel": False, "implied_speed_kmh": None, "reason": None}

    coordinates = [transaction.get("latitude"), transaction.get("longitude"), previous_transaction.get("latitude"), previous_transaction.get("longitude")]
    if any(value is None for value in coordinates):
        return {"impossible_travel": False, "implied_speed_kmh": None, "reason": None}
    try:
        coordinates = [float(value) for value in coordinates]
    except (TypeError, ValueError):
        return {"impossible_travel": False, "implied_speed_kmh": None, "reason": None}

    ts_now = _parse_ts(transaction["timestamp"])
    ts_prev = _parse_ts(previous_transaction["timestamp"])
    elapsed_seconds = (ts_now - ts_prev).total_seconds()

    if elapsed_seconds <= 0 or elapsed_seconds < MIN_ELAPSED_SECONDS:
        return {"impossible_travel": False, "implied_speed_kmh": None, "reason": None}

    distance_km = _haversine_km(
        coordinates[2], coordinates[3], coordinates[0], coordinates[1],
    )
    implied_speed_kmh = distance_km / (elapsed_seconds / 3600.0)

    if implied_speed_kmh > IMPLAUSIBLE_SPEED_KMH:
        return {
            "impossible_travel": True,
            "implied_speed_kmh": round(implied_speed_kmh, 1),
            "reason": (
                f"{round(distance_km)}km in {round(elapsed_seconds / 60, 1)} min implies "
                f"{round(implied_speed_kmh)} km/h, exceeding plausible travel speed"
            ),
        }

    return {"impossible_travel": False, "implied_speed_kmh": round(implied_speed_kmh, 1), "reason": None}


if __name__ == "__main__":
    prev = {"timestamp": "2026-09-22T10:00:00", "latitude": 12.9716, "longitude": 77.5946}  # Bangalore
    now = {"timestamp": "2026-09-22T10:10:00", "latitude": 28.7041, "longitude": 77.1025}   # Delhi
    print(check_impossible_travel(now, prev))
