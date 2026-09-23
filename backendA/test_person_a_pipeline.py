from pathlib import Path

import numpy as np
import pandas as pd

from backendA.anomaly import BehavioralAnomalyModel
from backendA.baseline import build_user_baseline
from backendA.features import generate_features
from backendA.preprocessing import load_transactions, preprocess_transactions
from backendA.scoring import score_transactions


DATA_DIR = Path(__file__).parent / "data"


def test_preprocessing_handles_malformed_values() -> None:
    raw = pd.read_csv(DATA_DIR / "train.csv").head(1).astype(object)
    raw.loc[raw.index[0], "timestamp"] = "not-a-date"
    raw.loc[raw.index[0], "amount"] = "not-a-number"
    raw.loc[raw.index[0], "merchant"] = np.nan

    result = preprocess_transactions(raw)

    assert pd.isna(result.loc[result.index[0], "timestamp"])
    assert result.loc[result.index[0], "amount"] == 0.0
    assert result.loc[result.index[0], "merchant"] == "UNKNOWN"


def test_scoring_pipeline_outputs_bounded_numeric_signals() -> None:
    train = load_transactions(DATA_DIR / "train.csv")
    validation = load_transactions(DATA_DIR / "validation.csv")
    baseline = build_user_baseline(train)
    model = BehavioralAnomalyModel(random_state=42).fit(train, baseline)

    features, signals = score_transactions(validation, baseline, model, history=train)

    assert list(features.columns) == [
        "amount_deviation",
        "time_deviation",
        "location_distance",
        "merchant_novelty",
        "category_deviation",
        "transaction_frequency",
    ]
    assert features.isna().sum().sum() == 0
    assert signals.isna().sum().sum() == 0
    assert np.isfinite(features.to_numpy()).all()
    assert np.isfinite(signals.to_numpy()).all()
    assert signals.min().min() >= 0.0
    assert signals.max().max() <= 1.0


def test_model_fit_does_not_use_labels() -> None:
    train = load_transactions(DATA_DIR / "train.csv")
    validation = load_transactions(DATA_DIR / "validation.csv")
    relabeled = train.copy()
    relabeled["is_anomaly"] = 1 - relabeled["is_anomaly"].astype(int)
    relabeled["anomaly_type"] = "RELABELLED"

    baseline = build_user_baseline(train)
    relabeled_baseline = build_user_baseline(relabeled)
    model = BehavioralAnomalyModel(random_state=42).fit(train, baseline)
    relabeled_model = BehavioralAnomalyModel(random_state=42).fit(relabeled, relabeled_baseline)
    features = generate_features(validation, baseline, history=train)
    relabeled_features = generate_features(validation, relabeled_baseline, history=relabeled)

    assert np.allclose(model.score(features), relabeled_model.score(relabeled_features))
