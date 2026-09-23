import { useEffect, useState } from "react";
import "./TravelModePage.css";
import { getCurrentUserName, getTravelMode, enableTravelMode, disableTravelMode } from "../api";
import { authenticateBiometric } from "../webauthnClient";

function TravelModePage({ onNavigate }) {
  const [travelMode, setTravelMode] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getTravelMode()
      .then((status) => setTravelMode(Boolean(status.enabled)))
      .catch((err) => setError(err.message));
  }, []);

  const handleToggle = () => {
    if (travelMode) {
      handleDisable();
      return;
    }
    setShowConfirm(true);
  };

  const confirmTravelMode = async () => {
    setError(null);
    setBusy(true);
    try {
      // Biometric confirmation before enabling, per the original plan.
      const verificationToken = await authenticateBiometric();
      await enableTravelMode({
        destination,
        start_date: startDate,
        end_date: endDate,
      }, verificationToken);
      setTravelMode(true);
      setShowConfirm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setError(null);
    setBusy(true);
    try {
      const verificationToken = await authenticateBiometric();
      await disableTravelMode(verificationToken);
      setTravelMode(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const protectedChecks = [
    {
      title: "Transaction amount",
      description: "Unusual spending amounts remain monitored.",
      status: "Active",
    },
    {
      title: "Merchant behavior",
      description: "Unknown or unusual merchants remain monitored.",
      status: "Active",
    },
    {
      title: "Transaction velocity",
      description: "Rapid transaction patterns remain monitored.",
      status: "Active",
    },
    {
      title: "Duplicate transactions",
      description: "Repeated transactions remain monitored.",
      status: "Active",
    },
  ];

  return (
    <div className="travel-page">
      <aside className="travel-sidebar">
        <button
          type="button"
          className="travel-logo"
          onClick={() => onNavigate("dashboard")}
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <div className="travel-logo-mark">S</div>

          <div>
            <strong>SentinelPay</strong>
            <span>Behavioral Security</span>
          </div>
        </button>

        <nav className="travel-nav">
          <button type="button" onClick={() => onNavigate("dashboard")}>
            <span>⌂</span>
            Dashboard
          </button>

          <button type="button" onClick={() => onNavigate("transactions")}>
            <span>↔</span>
            Transactions
          </button>

          <button type="button" onClick={() => onNavigate("alerts")}>
            <span>!</span>
            Alerts
          </button>

          <button
            type="button"
            onClick={() => onNavigate("location")}
          >
            <span>⌖</span>
            Location Activity
          </button>

          <button type="button" className="active" onClick={() => onNavigate("travel-mode")}>
            <span>✈</span>
            Travel Mode
          </button>

          <button type="button" onClick={() => onNavigate("profile")}>
            <span>◯</span>
            Profile
          </button>
        </nav>

        <div className="travel-sidebar-bottom">
          <div className="travel-protection">
            <i></i>

            <div>
              <strong>Protection active</strong>
              <span>SentinelPay is monitoring</span>
            </div>
          </div>

          <button type="button" onClick={() => onNavigate("landing")}>
            Log out
          </button>
        </div>
      </aside>

      <main className="travel-main">
        <header className="travel-header">
          <div>
            <p className="travel-eyebrow">BEHAVIORAL SECURITY</p>

            <h1>Travel Mode</h1>

            <p>
              Tell SentinelPay when you're traveling so location changes
              don't unnecessarily trigger alerts.
            </p>
          </div>

          <div className="travel-user">
            <div className="travel-notification">🔔</div>

            <div className="travel-avatar">J</div>

            <div>
              <strong>{getCurrentUserName()}</strong>
              <span>Protected account</span>
            </div>
          </div>
        </header>

        {error && (
          <p style={{ padding: "1rem", color: "#c0392b" }}>{error}</p>
        )}

        <section className={`travel-hero ${travelMode ? "enabled" : ""}`}>
          <div className="travel-plane">✈</div>

          <div className="travel-hero-content">
            <p>{travelMode ? "TRAVEL MODE ACTIVE" : "TRAVEL MODE"}</p>

            <h2>
              {travelMode
                ? "You're protected while traveling."
                : "Travel without unnecessary alerts."}
            </h2>

            <span>
              {travelMode
                ? "Location-based anomaly sensitivity has been reduced. Other security checks remain active."
                : "Temporarily reduce location-based anomaly sensitivity while keeping your other security protections active."}
            </span>
          </div>

          <button
            className={`travel-toggle ${travelMode ? "on" : ""}`}
            onClick={handleToggle}
            aria-label="Toggle Travel Mode"
            disabled={busy}
          >
            <span></span>
          </button>
        </section>

        <section className="travel-status-card">
          <div className="travel-status-icon">{travelMode ? "✓" : "○"}</div>

          <div className="travel-status-content">
            <strong>
              {travelMode
                ? "Travel Mode is currently active"
                : "Travel Mode is currently off"}
            </strong>

            <p>
              {travelMode
                ? "SentinelPay will be more tolerant of location changes during your trip."
                : "Your normal location baseline is being used for anomaly detection."}
            </p>
          </div>

          <div className={`travel-status-badge ${travelMode ? "active" : ""}`}>
            {travelMode ? "ACTIVE" : "OFF"}
          </div>
        </section>

        <section className="travel-grid">
          <div className="travel-info-card">
            <div className="travel-card-heading">
              <div>
                <p>LOCATION PROTECTION</p>
                <h2>What changes?</h2>
              </div>
            </div>

            <div className="location-change">
              <div className="change-icon">⌖</div>

              <div>
                <strong>Location sensitivity is reduced</strong>

                <span>
                  A transaction from a new city is less likely to be
                  flagged solely because the location differs from your
                  normal baseline.
                </span>
              </div>
            </div>
          </div>

          <div className="travel-info-card">
            <div className="travel-card-heading">
              <div>
                <p>SECURITY BALANCE</p>
                <h2>What stays active?</h2>
              </div>
            </div>

            <div className="protected-checks">
              {protectedChecks.map((check) => (
                <div className="protected-check" key={check.title}>
                  <div>✓</div>

                  <div>
                    <strong>{check.title}</strong>
                    <span>{check.description}</span>
                  </div>

                  <b>{check.status}</b>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="travel-security-note">
          <div>!</div>

          <p>
            <strong>Travel Mode does not disable fraud protection.</strong>{" "}
            It only changes how strongly location differences contribute
            to the risk score. Amount, merchant, velocity, duplicate and
            other security signals remain active.
          </p>
        </section>
      </main>

      {showConfirm && (
        <div className="travel-modal-backdrop">
          <div className="travel-modal">
            <div className="modal-icon">✈</div>

            <h2>Enable Travel Mode?</h2>

            <p>
              Location-based anomaly detection will become less sensitive
              while you're traveling. You'll be asked to confirm with
              biometric authentication.
            </p>

            <div style={{ display: "grid", gap: "0.5rem", margin: "1rem 0" }}>
              <input
                type="text"
                placeholder="Destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setShowConfirm(false)}>
                Cancel
              </button>

              <button
                className="modal-confirm"
                onClick={confirmTravelMode}
                disabled={busy || !destination || !startDate || !endDate}
              >
                {busy ? "Verifying…" : "Verify & Enable"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TravelModePage;
