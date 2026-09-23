"""Run the SentinelPay judge demo against a local FastAPI server."""

import argparse
import json
from urllib.error import HTTPError
from urllib.request import Request, urlopen

SCENARIOS = (
    "normal",
    "location-anomaly",
    "amount-anomaly",
    "time-anomaly",
    "merchant-anomaly",
    "shadow-subscription",
    "multi-signal",
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run deterministic SentinelPay demo scenarios")
    parser.add_argument("scenario", nargs="?", choices=SCENARIOS, default="normal")
    parser.add_argument("--user", default="judge-demo")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    args = parser.parse_args()
    url = f"{args.base_url.rstrip('/')}/demo/users/{args.user}/scenario/{args.scenario}"
    try:
        with urlopen(Request(url, method="POST"), timeout=15) as response:
            payload = json.load(response)
    except HTTPError as error:
        raise SystemExit(f"Demo request failed ({error.code}): {error.read().decode()}") from error
    risk = payload["risk"]
    print(f"Scenario: {args.scenario}")
    print(f"Transaction: {payload['transaction_id']}")
    print(f"Decision: {risk['risk_level']} / {risk['recommended_action']}")
    print(f"Risk score: {risk['risk_score']}/100")
    print("Behavioral signals:")
    for name, value in risk["behavioral_signals"].items():
        print(f"  {name}: {value:.2f}")
    print("Security signals:")
    print(json.dumps(risk["security_signals"], indent=2))
    print("Explanation:")
    for reason in risk["reasons"]:
        print(f"  - {reason}")


if __name__ == "__main__":
    main()
