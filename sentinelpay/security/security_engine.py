"""Package-safe, normalized deterministic security analysis."""
from typing import Any

from .duplicate import is_duplicate
from .impossible_travel import check_impossible_travel
from .subscription import detect_subscription
from .velocity import check_velocity


def analyze(transaction: dict[str, Any], recent_transactions: list[dict[str, Any]], previous_transaction: dict[str, Any] | None, transaction_history: list[dict[str, Any]] | None = None, whitelisted_merchants: set[str] | None = None, travel_mode: bool = False) -> dict[str, Any]:
    """Run all checks; `score` is normalized 0-1 for risk aggregation.

    Long history supports subscription detection. Travel mode suppresses only
    impossible-travel's contribution and reason.
    """
    duplicate = is_duplicate(transaction, recent_transactions)
    velocity = check_velocity(transaction, recent_transactions)
    travel = check_impossible_travel(transaction, previous_transaction)
    subscription = detect_subscription(transaction, transaction_history if transaction_history is not None else recent_transactions, whitelisted_merchants)
    contributions = {"duplicate": .45 * float(duplicate["duplicate"]), "velocity": .30 * float(velocity["high_velocity"]), "impossible_travel": .20 * float(travel["impossible_travel"] and not travel_mode), "subscription": .05 * float(subscription["subscription_risk"])}
    checks = ((duplicate, duplicate["duplicate"]), (velocity, velocity["high_velocity"]), (travel, travel["impossible_travel"] and not travel_mode), (subscription, subscription["subscription_risk"]))
    return {"duplicate": duplicate, "velocity": velocity, "impossible_travel": travel, "subscription": subscription, "travel_mode_applied": travel_mode, "contributions": contributions, "score": round(sum(contributions.values()), 4), "security_reasons": [result["reason"] for result, enabled in checks if enabled and result.get("reason")]}
