"""Deterministic Isolation Forest anomaly detector."""

from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

try:
    from .features import FEATURE_COLUMNS, generate_features
except ImportError:
    from features import FEATURE_COLUMNS, generate_features


class BehavioralAnomalyModel:
    """Isolation Forest trained on unlabeled training feature vectors."""

    def __init__(self, random_state: int = 42, contamination: str | float = "auto") -> None:
        self.random_state = random_state
        self.contamination = contamination
        self.model: IsolationForest | None = None
        self.score_low = 0.0
        self.score_high = 1.0

    def fit(self, train_df: pd.DataFrame, baseline: dict[str, Any]) -> "BehavioralAnomalyModel":
        features = generate_features(train_df, baseline)
        self.model = IsolationForest(n_estimators=250, contamination=self.contamination, random_state=self.random_state, n_jobs=1)
        self.model.fit(features[FEATURE_COLUMNS])
        raw = self.model.decision_function(features[FEATURE_COLUMNS])
        self.score_low = float(np.quantile(raw, 0.05)) if len(raw) else 0.0
        self.score_high = float(np.quantile(raw, 0.95)) if len(raw) else 1.0
        if self.score_high <= self.score_low:
            self.score_high = self.score_low + 1.0
        return self

    def score(self, features: pd.DataFrame) -> np.ndarray:
        if self.model is None:
            raise RuntimeError("BehavioralAnomalyModel must be fitted before scoring")
        raw = self.model.decision_function(features[FEATURE_COLUMNS])
        return np.clip((self.score_high - raw) / (self.score_high - self.score_low), 0.0, 1.0)
