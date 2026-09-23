"""Train, tune on validation, and evaluate the Person A pipeline."""

from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.metrics import (average_precision_score, confusion_matrix, f1_score,
                             precision_score, recall_score, roc_auc_score)

try:
    from .anomaly import BehavioralAnomalyModel
    from .baseline import build_user_baseline
    from .preprocessing import load_transactions
    from .scoring import score_transactions
except ImportError:
    from anomaly import BehavioralAnomalyModel
    from baseline import build_user_baseline
    from preprocessing import load_transactions
    from scoring import score_transactions


DATA_DIR = Path(__file__).parent / "data"


def _metrics(labels: np.ndarray, scores: np.ndarray, threshold: float) -> dict[str, Any]:
    predictions = (scores >= threshold).astype(int)
    result: dict[str, Any] = {
        "threshold": float(threshold),
        "precision": float(precision_score(labels, predictions, zero_division=0)),
        "recall": float(recall_score(labels, predictions, zero_division=0)),
        "f1": float(f1_score(labels, predictions, zero_division=0)),
        "confusion_matrix": confusion_matrix(labels, predictions, labels=[0, 1]).tolist(),
        "anomaly_count": int(predictions.sum()),
        "false_positives": int(((predictions == 1) & (labels == 0)).sum()),
        "false_negatives": int(((predictions == 0) & (labels == 1)).sum()),
    }
    result["roc_auc"] = float(roc_auc_score(labels, scores)) if len(np.unique(labels)) > 1 else None
    result["pr_auc"] = float(average_precision_score(labels, scores)) if len(np.unique(labels)) > 1 else None
    return result


def _choose_threshold(labels: np.ndarray, scores: np.ndarray) -> float:
    candidates = np.unique(np.concatenate(([0.0, 1.0], scores)))
    results = [_metrics(labels, scores, float(candidate)) for candidate in candidates]
    return max(results, key=lambda result: (result["f1"], result["precision"]))["threshold"]


def _print_breakdown(frame: pd.DataFrame, scores: np.ndarray, threshold: float) -> None:
    scored = frame[["anomaly_type"]].copy()
    scored["score"] = scores
    scored["label"] = frame["is_anomaly"].astype(int).to_numpy()
    print("by_anomaly_type:")
    for anomaly_type, group in scored.groupby("anomaly_type", dropna=False):
        metrics = _metrics(group["label"].to_numpy(), group["score"].to_numpy(), threshold)
        print(f"  {anomaly_type}: count={len(group)} f1={metrics['f1']:.3f} recall={metrics['recall']:.3f}")


def run_evaluation() -> None:
    train = load_transactions(DATA_DIR / "train.csv")
    validation = load_transactions(DATA_DIR / "validation.csv")
    test = load_transactions(DATA_DIR / "test.csv")

    baseline = build_user_baseline(train)
    model = BehavioralAnomalyModel(random_state=42, contamination="auto").fit(train, baseline)
    _, validation_signals = score_transactions(validation, baseline, model, history=train)
    validation_scores = validation_signals["personal_anomaly"].to_numpy()
    threshold = _choose_threshold(validation["is_anomaly"].astype(int).to_numpy(), validation_scores)

    _, test_signals = score_transactions(test, baseline, model, history=pd.concat([train, validation], ignore_index=True))
    test_scores = test_signals["personal_anomaly"].to_numpy()
    print("validation_metrics:", _metrics(validation["is_anomaly"].astype(int).to_numpy(), validation_scores, threshold))
    print("test_metrics:", _metrics(test["is_anomaly"].astype(int).to_numpy(), test_scores, threshold))
    _print_breakdown(validation, validation_scores, threshold)
    _print_breakdown(test, test_scores, threshold)

    inspected_types = ["NORMAL", "AMOUNT_ANOMALY", "LOCATION_ANOMALY", "TIME_ANOMALY", "MERCHANT_ANOMALY", "MULTI_SIGNAL_ANOMALY"]
    examples = test.assign(_score=test_scores).loc[test["anomaly_type"].isin(inspected_types)].groupby("anomaly_type", sort=False).head(1)
    print("manual_examples:")
    for index, row in examples.iterrows():
        signal_values = {key: float(value) for key, value in test_signals.loc[index].items()}
        print(f"  {row['anomaly_type']} {row['transaction_id']}: {signal_values}")


if __name__ == "__main__":
    run_evaluation()