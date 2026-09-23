from datetime import datetime
from statistics import mean, pstdev
from typing import Any

AMOUNT_TOLERANCE, MIN_OCCURRENCES, INTERVAL_TOLERANCE_RATIO = 0.05, 3, 0.2


def _parse_ts(value: datetime | str) -> datetime:
    return value if isinstance(value, datetime) else datetime.fromisoformat(value)


def detect_subscription(transaction: dict[str, Any], transaction_history: list[dict[str, Any]], whitelisted_merchants: set[str] | None = None) -> dict[str, Any]:
    merchant, amount = str(transaction["merchant"]).strip(), float(transaction["amount"])
    if merchant.lower() in {item.strip().lower() for item in (whitelisted_merchants or set())}:
        return {"subscription_risk": False, "merchant": None, "amount": None, "interval_days": None, "reason": None}
    matches = [item for item in transaction_history if str(item.get("merchant", "")).strip().lower() == merchant.lower() and abs(float(item["amount"]) - amount) / max(amount, 1e-9) <= AMOUNT_TOLERANCE]
    occurrences = sorted([*matches, transaction], key=lambda item: _parse_ts(item["timestamp"]))
    if len(occurrences) < MIN_OCCURRENCES:
        return {"subscription_risk": False, "merchant": None, "amount": None, "interval_days": None, "reason": None}
    dates = [_parse_ts(item["timestamp"]) for item in occurrences]
    intervals = [(dates[i] - dates[i - 1]).total_seconds() / 86400 for i in range(1, len(dates))]
    average = mean(intervals)
    if average <= 0 or len(intervals) < 2 or pstdev(intervals) / average > INTERVAL_TOLERANCE_RATIO:
        return {"subscription_risk": False, "merchant": None, "amount": None, "interval_days": None, "reason": None}
    average = round(average, 1)
    return {"subscription_risk": True, "merchant": merchant, "amount": amount, "interval_days": average, "reason": f"'{merchant}' has charged a similar amount every ~{average} days across {len(occurrences)} charges"}
