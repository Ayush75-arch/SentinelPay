"""Person A behavioral scoring pipeline.

This module emits behavioral risk signals only. It does not make an allow or
block decision.
"""

from typing import Any

import pandas as pd

try:
    from .anomaly import BehavioralAnomalyModel
    from .features import generate_features
except ImportError:
    from anomaly import BehavioralAnomalyModel
    from features import generate_features


SIGNAL_MAP = {
    "amount_anomaly": "amount_deviation",
    "time_anomaly": "time_deviation",
    "location_anomaly": "location_distance",
    "merchant_anomaly": "merchant_novelty",
    "frequency_anomaly": "transaction_frequency",
    "category_anomaly": "category_deviation",
}


def _normalise_location(values: pd.Series) -> pd.Series:
    """Convert location distance in kilometers into a 0-1 risk signal."""
    return (values / 25.0).clip(0.0, 1.0)


def score_transactions(
    transactions: pd.DataFrame,
    baseline: dict[str, Any],
    model: BehavioralAnomalyModel,
    history: pd.DataFrame | None = None,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Return contextual features and normalized behavioral risk signals."""
    features = generate_features(transactions, baseline, history)
    signals = pd.DataFrame(index=features.index)

    for signal_name, feature_name in SIGNAL_MAP.items():
        values = features[feature_name]
        signals[signal_name] = _normalise_location(values) if feature_name == "location_distance" else values.clip(0.0, 1.0)

    signals["model_score"] = model.score(features)
    combined_columns = [*SIGNAL_MAP, "model_score"]
    signals["personal_anomaly"] = signals[combined_columns].mean(axis=1).clip(0.0, 1.0)
    return features, signals[["personal_anomaly", *SIGNAL_MAP, "model_score"]]


def score_transaction(
    transaction: pd.Series,
    baseline: dict[str, Any],
    model: BehavioralAnomalyModel,
    history: pd.DataFrame | None = None,
) -> dict[str, float]:
    """Score one transaction and return JSON-friendly signal values."""
    _, signals = score_transactions(transaction.to_frame().T, baseline, model, history)
    return {key: float(value) for key, value in signals.iloc[0].items()}
