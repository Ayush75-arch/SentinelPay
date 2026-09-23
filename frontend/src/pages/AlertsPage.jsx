import { useEffect, useState } from "react";
import "./AlertsPage.css";
import { getCurrentUserName, getUserTransactions, reviewTransaction } from "../api";
import { authenticateBiometric } from "../webauthnClient";

function toAlert(t) {
  return {
    id: `ALT-${t.transaction_id}`,
    transactionId: t.transaction_id,
    merchant: t.merchant_name,
    amount: t.amount,
    time: new Date(t.timestamp).toLocaleString(),
    location:
      t.latitude != null && t.longitude != null
        ? `${t.latitude.toFixed(2)}, ${t.longitude.toFixed(2)}`
        : "Unknown",
    risk: t.risk?.risk_level === "HIGH" ? "High" : "Medium",
    score: t.risk?.risk_score ?? 0,
    reasons: t.risk?.reasons?.length ? t.risk.reasons : ["Flagged by risk engine"],
    reviewStatus: t.review_status ?? "OPEN",
  };
}

function AlertsPage({ onNavigate }) {
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [verificationState, setVerificationState] = useState("idle");
  const [handledAlerts, setHandledAlerts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verifyError, setVerifyError] = useState(null);

  useEffect(() => {
    getUserTransactions()
      .then((transactions) => {
        const flagged = transactions
          .filter((t) => (t.risk?.risk_level === "HIGH" || t.risk?.risk_level === "MEDIUM") && t.review_status !== "APPROVED" && t.review_status !== "REJECTED")
          .map(toAlert);
        setAlerts(flagged);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const activeAlerts = alerts.filter((alert) => !handledAlerts.includes(alert.id));

  const handleVerification = async () => {
    setVerificationState("verifying");
    setVerifyError(null);
    try {
      await authenticateBiometric();
      setVerificationState("verified");
    } catch (err) {
      setVerifyError(err.message);
      setVerificationState("idle");
    }
  };

  const handleApprove = async () => {
    if (!selectedAlert) return;
    try {
      await reviewTransaction(selectedAlert.transactionId, "APPROVED");
      setHandledAlerts((current) => [...current, selectedAlert.id]);
      setSelectedAlert(null);
      setVerificationState("idle");
    } catch (err) {
      setVerifyError(err.message);
    }
  };

  const handleReject = async () => {
    if (!selectedAlert) return;
    try {
      await reviewTransaction(selectedAlert.transactionId, "REJECTED");
      setHandledAlerts((current) => [...current, selectedAlert.id]);
      setSelectedAlert(null);
      setVerificationState("idle");
    } catch (err) {
      setVerifyError(err.message);
    }
  };

  const selectAlert = (alert) => {
    setSelectedAlert(alert);
    setVerificationState("idle");
    setVerifyError(null);
  };

  return (
    <div className="alerts-page">
      <aside className="alerts-sidebar">
        <button type="button" className="alerts-logo" onClick={() => onNavigate("dashboard")}>
          <div className="alerts-logo-mark">S</div>

          <div>
            <strong>SentinelPay</strong>
            <span>Behavioral Security</span>
          </div>
        </button>

        <nav className="alerts-nav">
          <button type="button" onClick={() => onNavigate("dashboard")}>
            <span>⌂</span>
            Dashboard
          </button>

          <button type="button" onClick={() => onNavigate("transactions")}>
            <span>↔</span>
            Transactions
          </button>

          <button type="button" className="active" onClick={() => onNavigate("alerts")}>
            <span>!</span>
            Alerts
            {activeAlerts.length > 0 && <b>{activeAlerts.length}</b>}
          </button>

          <button
            type="button"
            onClick={() => onNavigate("location")}
          >
            <span>⌖</span>
            Location Activity
          </button>

          <button type="button" onClick={() => onNavigate("travel-mode")}>
            <span>✈</span>
            Travel Mode
          </button>

          <button type="button" onClick={() => onNavigate("profile")}>
            <span>◯</span>
            Profile
          </button>
        </nav>

        <div className="alerts-sidebar-bottom">
          <div className="alerts-protection">
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

      <main className="alerts-main">
        <header className="alerts-header">
          <div>
            <p className="alerts-eyebrow">SECURITY CENTER</p>

            <h1>Alerts</h1>

            <p>Review unusual activity and verify transactions that require your attention.</p>
          </div>

          <button type="button" className="alerts-profile" onClick={() => onNavigate("profile")}>
            <div className="alerts-notification">
              🔔
              <i></i>
            </div>

            <div className="alerts-avatar">J</div>

            <div>
              <strong>{getCurrentUserName()}</strong>
              <span>Protected account</span>
            </div>
          </button>
        </header>

        {loading && <p style={{ padding: "1rem" }}>Loading alerts…</p>}
        {error && (
          <p style={{ padding: "1rem", color: "#c0392b" }}>
            Couldn't load alerts: {error}
          </p>
        )}

        {!loading && !error && (
          <>
            <section className="alert-summary-grid">
              <div className="alert-summary-card">
                <div className="summary-icon danger">!</div>

                <div>
                  <span>Active alerts</span>
                  <strong>{activeAlerts.length}</strong>
                  <small>Requires attention</small>
                </div>
              </div>

              <div className="alert-summary-card">
                <div className="summary-icon warning">!</div>

                <div>
                  <span>Medium risk</span>
                  <strong>
                    {activeAlerts.filter((alert) => alert.risk === "Medium").length}
                  </strong>
                  <small>Behavioral anomalies</small>
                </div>
              </div>

              <div className="alert-summary-card">
                <div className="summary-icon secure">✓</div>

                <div>
                  <span>Handled this session</span>
                  <strong>{handledAlerts.length}</strong>
                  <small>Transactions reviewed</small>
                </div>
              </div>
            </section>

            <section className="alerts-layout">
              <div className="alerts-list-card">
                <div className="alerts-card-header">
                  <div>
                    <p>RECENT ALERTS</p>
                    <h2>Activity requiring attention</h2>
                  </div>

                  <span className="alert-count">{activeAlerts.length} active</span>
                </div>

                <div className="alerts-list">
                  {activeAlerts.map((alert) => (
                    <button
                      type="button"
                      className={`alert-list-item ${
                        selectedAlert?.id === alert.id ? "selected" : ""
                      }`}
                      key={alert.id}
                      onClick={() => selectAlert(alert)}
                    >
                      <div className={`alert-merchant-icon ${alert.risk.toLowerCase()}`}>
                        {alert.merchant?.charAt(0)}
                      </div>

                      <div className="alert-list-content">
                        <div className="alert-list-top">
                          <strong>{alert.merchant}</strong>

                          <span className={`alert-risk-pill ${alert.risk.toLowerCase()}`}>
                            {alert.risk}
                          </span>
                        </div>

                        <span>
                          {alert.transactionId} · {alert.time}
                        </span>

                        <small>{alert.reasons[0]}</small>
                      </div>

                      <div className="alert-list-amount">
                        <strong>₹{alert.amount.toLocaleString("en-IN")}</strong>

                        <span>{alert.score}/100</span>
                      </div>
                    </button>
                  ))}

                  {activeAlerts.length === 0 && (
                    <div className="no-alerts">
                      <div>✓</div>

                      <strong>You're all caught up</strong>

                      <p>No active security alerts require your attention.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="alert-detail-card">
                {!selectedAlert && (
                  <div className="alert-detail-empty">
                    <div>!</div>

                    <strong>Select an alert</strong>

                    <p>
                      Choose an alert from the list to review the transaction
                      and verify its activity.
                    </p>
                  </div>
                )}

                {selectedAlert && (
                  <>
                    <div className="alert-detail-header">
                      <div>
                        <span className="selected-alert-label">SELECTED ALERT</span>

                        <h2>{selectedAlert.merchant}</h2>

                        <p>{selectedAlert.transactionId}</p>
                      </div>

                      <span className={`selected-risk ${selectedAlert.risk.toLowerCase()}`}>
                        {selectedAlert.risk} risk
                      </span>
                    </div>

                    <div className="selected-amount">
                      <span>Transaction amount</span>

                      <strong>₹{selectedAlert.amount.toLocaleString("en-IN")}</strong>
                    </div>

                    <div className="selected-details">
                      <div>
                        <span>Time</span>
                        <strong>{selectedAlert.time}</strong>
                      </div>

                      <div>
                        <span>Location</span>
                        <strong>{selectedAlert.location}</strong>
                      </div>
                    </div>

                    <div className="selected-risk-score">
                      <div>
                        <span>Risk score</span>
                        <strong>{selectedAlert.score}/100</strong>
                      </div>

                      <div className="mini-risk-track">
                        <div style={{ width: `${selectedAlert.score}%` }}></div>
                      </div>
                    </div>

                    <div className="alert-reasons">
                      <p>WHY IT WAS FLAGGED</p>

                      {selectedAlert.reasons.map((reason) => (
                        <div key={reason}>
                          <span>•</span>
                          {reason}
                        </div>
                      ))}
                    </div>

                    <div className="verification-area">
                      {verifyError && (
                        <p style={{ color: "#c0392b" }}>{verifyError}</p>
                      )}

                      {verificationState === "idle" && (
                        <>
                          <div className="verification-lock">⌾</div>

                          <div>
                            <strong>Verify this transaction</strong>

                            <p>Confirm with your device biometric authentication.</p>
                          </div>

                          <button
                            type="button"
                            onClick={handleVerification}
                            className="biometric-button"
                          >
                            Verify with biometric
                          </button>
                        </>
                      )}

                      {verificationState === "verifying" && (
                        <div className="verification-progress">
                          <div className="scan-icon">◉</div>

                          <strong>Waiting for biometric verification...</strong>

                          <p>Complete the authentication request on your device.</p>
                        </div>
                      )}

                      {verificationState === "verified" && (
                        <div className="verification-success">
                          <div>✓</div>

                          <strong>Identity verified</strong>

                          <p>
                            Your identity was successfully verified. What
                            would you like to do with this transaction?
                          </p>

                          <div className="verification-actions">
                            <button
                              type="button"
                              className="approve-button"
                              onClick={handleApprove}
                            >
                              Approve transaction
                            </button>

                            <button
                              type="button"
                              className="reject-button"
                              onClick={handleReject}
                            >
                              Reject transaction
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </section>
          </>
        )}

        <section className="security-note">
          <div>i</div>

          <p>
            <strong>Your biometric data stays on your device.</strong>{" "}
            SentinelPay uses WebAuthn to request authentication without
            storing your fingerprint or face data.
          </p>
        </section>
      </main>
    </div>
  );
}

export default AlertsPage;
