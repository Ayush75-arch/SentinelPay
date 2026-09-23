"""Per-user geographic profiles and Haversine distance calculations."""

from math import asin, cos, radians, sin, sqrt
from typing import Any

import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN


EARTH_RADIUS_KM = 6371.0088


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    lat_delta = radians(lat2 - lat1)
    lon_delta = radians(lon2 - lon1)
    first = sin(lat_delta / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(lon_delta / 2) ** 2
    return 2 * EARTH_RADIUS_KM * asin(sqrt(max(0.0, min(1.0, first))))


def fit_location_clusters(train_df: pd.DataFrame, min_samples: int = 3, eps_km: float = 1.5) -> dict[str, dict[str, Any]]:
    """Fit DBSCAN profiles from training coordinates only."""
    profiles: dict[str, dict[str, Any]] = {}
    for user_id, user_frame in train_df.groupby("user_id"):
        coordinates = user_frame[["latitude", "longitude"]].dropna().to_numpy(dtype=float)
        coordinates = coordinates[np.isfinite(coordinates).all(axis=1)]
        if len(coordinates) == 0:
            profiles[user_id] = {"clusters": [], "fallback_centroid": None}
            continue
        fallback = coordinates.mean(axis=0).tolist()
        if len(coordinates) < min_samples:
            profiles[user_id] = {"clusters": [], "fallback_centroid": fallback}
            continue
        radians_coordinates = np.radians(coordinates)
        labels = DBSCAN(eps=eps_km / EARTH_RADIUS_KM, min_samples=min_samples, metric="haversine").fit_predict(radians_coordinates)
        clusters = []
        for label in sorted(set(labels)):
            if label == -1:
                continue
            cluster_points = coordinates[labels == label]
            clusters.append({"centroid": cluster_points.mean(axis=0).tolist(), "count": int(len(cluster_points))})
        profiles[user_id] = {"clusters": clusters, "fallback_centroid": fallback}
    return profiles


def calculate_location_distance(transaction: pd.Series, user_location_profile: dict[str, Any]) -> float:
    """Return nearest normal-cluster distance in km; NaN means no usable coordinate."""
    latitude = pd.to_numeric(transaction.get("latitude"), errors="coerce")
    longitude = pd.to_numeric(transaction.get("longitude"), errors="coerce")
    if pd.isna(latitude) or pd.isna(longitude):
        return float("nan")
    centroids = [cluster["centroid"] for cluster in user_location_profile.get("clusters", [])]
    if not centroids and user_location_profile.get("fallback_centroid") is not None:
        centroids = [user_location_profile["fallback_centroid"]]
    if not centroids:
        return 0.0
    return min(_haversine_km(float(latitude), float(longitude), float(lat), float(lon)) for lat, lon in centroids)