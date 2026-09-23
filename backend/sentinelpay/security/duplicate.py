from datetime import datetime
from typing import Any

DUPLICATE_WINDOW_SECONDS = 120
AMOUNT_TOLERANCE = 0.01


def _parse_ts(value: datetime | str) -> datetime:
    return value if isinstance(value, datetime) else datetime.fromisoformat(value)


def is_duplicate(transaction: dict[str, Any], recent_transactions: list[dict[str, Any]]) -> dict[str, Any]:
    incoming_ts, incoming_amount = _parse_ts(transaction["timestamp"]), float(transaction["amount"])
    merchant = str(transaction["merchant"]).strip().lower()
    for prior in recent_transactions:
        if prior.get("id") == transaction.get("id") or str(prior.get("merchant", "")).strip().lower() != merchant:
            continue
        elapsed = (incoming_ts - _parse_ts(prior["timestamp"])).total_seconds()
        prior_amount = float(prior["amount"])
        if 0 <= elapsed <= DUPLICATE_WINDOW_SECONDS and prior_amount and abs(incoming_amount - prior_amount) / abs(prior_amount) <= AMOUNT_TOLERANCE:
            return {"duplicate": True, "matched_transaction_id": prior.get("id"), "reason": f"Same merchant '{transaction['merchant']}' charged a similar amount again {int(elapsed)}s later"}
    return {"duplicate": False, "matched_transaction_id": None, "reason": None}
