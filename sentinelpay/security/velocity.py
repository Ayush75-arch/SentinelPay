"""
Transaction velocity detection.

Flags a user as high-velocity when too many transactions land within a
short window, regardless of amount — a common signal for a compromised
card or automated skimming, independent of the duplicate-charge check.
"""

from datetime import datetime
from typing import List, Dict, Any

VELOCITY_WINDOW_SECONDS = 120  # look back 2 minutes
VELOCITY_MAX_COUNT = 4  # more than 4 transactions (this one + 3 prior) in that window is suspicious


def _parse_ts(ts) -> datetime:
    if isinstance(ts, datetime):
        return ts
    return datetime.fromisoformat(ts)


def check_velocity(transaction: Dict[str, Any], recent_transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Check whether the incoming transaction pushes the user over the
    allowed transaction count within VELOCITY_WINDOW_SECONDS.

    Args:
        transaction: the incoming transaction (id, timestamp).
        recent_transactions: same user's transactions within a short
            lookback window (e.g. last 10 minutes is plenty), supplied
            by Person B. Can be the same list passed to is_duplicate().

    Returns:
        {
            "high_velocity": bool,
            "count_in_window": int,
            "reason": str | None
        }
    """
    incoming_ts = _parse_ts(transaction["timestamp"])

    count_in_window = 1  # the incoming transaction itself counts
    for prior in recent_transactions:
        if prior.get("id") == transaction.get("id"):
            continue
        prior_ts = _parse_ts(prior["timestamp"])
        if 0 <= (incoming_ts - prior_ts).total_seconds() <= VELOCITY_WINDOW_SECONDS:
            count_in_window += 1

    if count_in_window > VELOCITY_MAX_COUNT:
        return {
            "high_velocity": True,
            "count_in_window": count_in_window,
            "reason": (
                f"{count_in_window} transactions within {VELOCITY_WINDOW_SECONDS}s, "
                f"exceeding the {VELOCITY_MAX_COUNT}-transaction threshold"
            ),
        }

    return {"high_velocity": False, "count_in_window": count_in_window, "reason": None}


if __name__ == "__main__":
    base = "2026-09-22T14:00:0{}"
    history = [{"id": f"TX00{i}", "timestamp": base.format(i)} for i in range(5)]
    incoming = {"id": "TX005", "timestamp": "2026-09-22T14:00:06"}
    print(check_velocity(incoming, history))