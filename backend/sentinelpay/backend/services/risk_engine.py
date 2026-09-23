def calculate_risk(
    ml_score: float,
    security_score: float,
    reasons: list[str] | None = None
):
    # Both inputs are normalized 0-1. This function alone converts to 0-100.
    ml_score = max(0.0, min(1.0, ml_score))
    security_score = max(0.0, min(1.0, security_score))

    risk_score = (
        (ml_score * 0.8 + security_score * 0.2) * 100.0
    )

    if risk_score >= 70:
        risk_level = "HIGH"
    elif risk_score >= 40:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return {
        "risk_score": round(risk_score, 2),
        "risk_level": risk_level,
        "reasons": reasons or []
    }
