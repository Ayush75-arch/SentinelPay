import { useEffect, useState } from "react";
import "./TransactionDetailsPage.css";
import { getCurrentUserName, getTransaction } from "../api";

function TransactionDetailsPage({ onNavigate, transactionId }) {
  const [record, setRecord] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!transactionId) return;
    getTransaction(transactionId).then(setRecord).catch((err) => setError(err.message));
  }, [transactionId]);

  if (!transactionId || error || !record) {
    return (
      <main style={{ padding: "2rem" }}>
        <button onClick={() => onNavigate("transactions")}>Back to transactions</button>
        <p>{error || "Loading transaction details…"}</p>
      </main>
    );
  }

  const timestamp = new Date(record.timestamp);
  const transaction = {
    id: record.transaction_id,
    merchant: record.merchant_name,
    category: record.category,
    amount: record.amount,
    currency: record.currency,
    date: timestamp.toLocaleDateString(),
    time: timestamp.toLocaleTimeString(),
    location: record.latitude != null && record.longitude != null ? `${record.latitude.toFixed(4)}, ${record.longitude.toFixed(4)}` : "Unknown",
    paymentMethod: record.payment_method,
    device: record.device_id || "Not supplied",
    riskScore: record.risk?.risk_score ?? 0,
    riskLevel: record.risk?.risk_level ?? "LOW",
  };

  const riskReasons = [
    {
      type: "danger",
      icon: "₹",
      title: "Unusual transaction amount",
      description:
        "₹8,500 is significantly higher than your normal transaction range.",
      comparison: "Typical range: ₹100 – ₹2,500",
    },
    {
      type: "danger",
      icon: "◷",
      title: "Unusual transaction time",
      description:
        "This transaction occurred at 2:11 AM, outside your normal spending hours.",
      comparison: "Usual activity: 7:00 AM – 11:30 PM",
    },
    {
      type: "danger",
      icon: "⌖",
      title: "Unusual location",
      description:
        "The transaction was made in Mumbai while your normal activity is centered around Bengaluru.",
      comparison: "Normal area: Bengaluru",
    },
    {
      type: "warning",
      icon: "◆",
      title: "Unknown merchant",
      description:
        "This merchant does not appear in your established transaction history.",
      comparison: "Merchant history: Not recognized",
    },
  ];

  const securityChecks = [
    {
      name: "Duplicate transaction",
      status: "Passed",
      description: "No recent duplicate detected",
    },
    {
      name: "Transaction velocity",
      status: "Passed",
      description: "No abnormal transaction burst detected",
    },
    {
      name: "Device check",
      status: "Review",
      description: "Transaction requires additional verification",
    },
    {
      name: "Merchant check",
      status: "Review",
      description: "Merchant is not in your normal history",
    },
  ];

  const displayRiskReasons = record.risk?.reasons?.length
    ? record.risk.reasons.map((description) => ({
        type: transaction.riskLevel === "HIGH" ? "danger" : "warning",
        icon: "!",
        title: "Risk signal",
        description,
        comparison: `Overall risk: ${transaction.riskLevel}`,
      }))
    : riskReasons;

  const securityContributions = record.risk?.security_signals?.contributions;
  const displaySecurityChecks = securityContributions
    ? Object.entries(securityContributions).map(([key, contribution]) => ({
        name: key.replaceAll("_", " "),
        status: contribution > 0 ? "Review" : "Passed",
        description: contribution > 0 ? "This check contributed to the risk score." : "No issue detected.",
      }))
    : securityChecks;

  const handleVerification = () => {
    /*
     * DEMO FLOW
     *
     * Later this button will trigger the WebAuthn flow
     * implemented by Person C.
     *
     * Future flow:
     * Transaction Details
     *       ↓
     * WebAuthn challenge
     *       ↓
     * Biometric verification
     *       ↓
     * Backend verification
     *       ↓
     * Transaction approved/rejected
     *
     * Raw biometric information must never be stored
     * by SentinelPay.
     */

    onNavigate("alerts");
  };

  return (
    <div className="transaction-details-page">
      <aside className="details-sidebar">
        <button
          type="button"
          className="details-logo"
          onClick={() => onNavigate("dashboard")}
        >
          <div className="details-logo-mark">S</div>

          <div>
            <strong>SentinelPay</strong>
            <span>Behavioral Security</span>
          </div>
        </button>

        <nav className="details-nav">
          <button
            type="button"
            onClick={() => onNavigate("dashboard")}
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            type="button"
            className="active"
            onClick={() => onNavigate("transactions")}
          >
            <span>↔</span>
            Transactions
          </button>

          <button
            type="button"
            onClick={() => onNavigate("alerts")}
          >
            <span>!</span>
            Alerts
            <b>3</b>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("location")}
          >
            <span>⌖</span>
            Location Activity
          </button>

          <button
            type="button"
            onClick={() => onNavigate("travel-mode")}
          >
            <span>✈</span>
            Travel Mode
          </button>

          <button
            type="button"
            onClick={() => onNavigate("profile")}
          >
            <span>◯</span>
            Profile
          </button>
        </nav>

        <div className="details-sidebar-bottom">
          <div className="details-protection">
            <i></i>

            <div>
              <strong>Protection active</strong>
              <span>SentinelPay is monitoring</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("landing")}
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="details-main">
        <header className="details-header">
          <div>
            <button
              type="button"
              className="back-link"
              onClick={() => onNavigate("transactions")}
            >
              ← Back to transactions
            </button>

            <p className="details-eyebrow">
              TRANSACTION REVIEW
            </p>

            <h1>Transaction details</h1>
          </div>

          <button
            type="button"
            className="details-user"
            onClick={() => onNavigate("profile")}
          >
            <div className="details-avatar">J</div>

            <div>
              <strong>{getCurrentUserName()}</strong>
              <span>Protected account</span>
            </div>
          </button>
        </header>

        <section className="transaction-hero">
          <div className="transaction-hero-left">
            <div className="large-merchant-icon">?</div>

            <div>
              <span className="transaction-status-badge">
                HIGH RISK
              </span>

              <h2>{transaction.merchant}</h2>

              <p>
                {transaction.id} · {transaction.category}
              </p>
            </div>
          </div>

          <div className="transaction-amount-large">
            <span>Transaction amount</span>

            <strong>
              ₹{transaction.amount.toLocaleString("en-IN")}
            </strong>
          </div>
        </section>

        <section className="risk-overview">
          <div className="risk-score-section">
            <div className="risk-score-circle">
              <div>
                <strong>{transaction.riskScore}</strong>
                <span>/100</span>
              </div>
            </div>

            <div>
              <span className="risk-label">
                OVERALL RISK SCORE
              </span>

              <h2>High risk detected</h2>

              <p>
                This transaction differs significantly from your
                established behavioral pattern.
              </p>
            </div>
          </div>

          <div className="risk-meter">
            <div className="risk-meter-labels">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>

            <div className="risk-meter-track">
              <div className="risk-meter-progress"></div>

              <div
                className="risk-meter-marker"
                style={{
                  left: `${transaction.riskScore}%`,
                }}
              ></div>
            </div>

            <div className="risk-meter-value">
              <strong>{transaction.riskScore}</strong>
              <span>Current score</span>
            </div>
          </div>
        </section>

        <div className="details-content-grid">
          <section className="details-card risk-reasons-card">
            <div className="details-card-header">
              <div>
                <p className="details-card-label">
                  BEHAVIORAL ANALYSIS
                </p>

                <h2>Why was this flagged?</h2>
              </div>

              <span className="reason-count">
                4 signals
              </span>
            </div>

            <div className="risk-reasons">
              {displayRiskReasons.map((reason) => (
                <article
                  className={`risk-reason ${reason.type}`}
                  key={`${reason.title}-${reason.description}`}
                >
                  <div className="reason-icon">
                    {reason.icon}
                  </div>

                  <div className="reason-content">
                    <div className="reason-title-row">
                      <strong>{reason.title}</strong>

                      <span>
                        {reason.type === "danger"
                          ? "Anomaly"
                          : "Warning"}
                      </span>
                    </div>

                    <p>{reason.description}</p>

                    <small>{reason.comparison}</small>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="details-card transaction-info-card">
            <div className="details-card-header">
              <div>
                <p className="details-card-label">
                  TRANSACTION INFORMATION
                </p>

                <h2>Payment details</h2>
              </div>
            </div>

            <div className="payment-details">
              <div>
                <span>Transaction ID</span>
                <strong>{transaction.id}</strong>
              </div>

              <div>
                <span>Date</span>
                <strong>{transaction.date}</strong>
              </div>

              <div>
                <span>Time</span>
                <strong>{transaction.time}</strong>
              </div>

              <div>
                <span>Location</span>
                <strong>{transaction.location}</strong>
              </div>

              <div>
                <span>Payment method</span>
                <strong>{transaction.paymentMethod}</strong>
              </div>

              <div>
                <span>Device</span>
                <strong>{transaction.device}</strong>
              </div>

              <div>
                <span>Category</span>
                <strong>{transaction.category}</strong>
              </div>
            </div>
          </section>
        </div>

        <section className="details-card security-checks-card">
          <div className="details-card-header">
            <div>
              <p className="details-card-label">
                SECURITY INTELLIGENCE
              </p>

              <h2>Security checks</h2>
            </div>

            <span className="security-check-summary">
              2 passed · 2 review
            </span>
          </div>

          <div className="security-check-list">
            {displaySecurityChecks.map((check) => (
              <div
                className="security-check"
                key={check.name}
              >
                <div
                  className={`security-check-icon ${check.status.toLowerCase()}`}
                >
                  {check.status === "Passed" ? "✓" : "!"}
                </div>

                <div className="security-check-content">
                  <strong>{check.name}</strong>
                  <span>{check.description}</span>
                </div>

                <span
                  className={`security-check-status ${check.status.toLowerCase()}`}
                >
                  {check.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="verification-card">
          <div className="verification-icon">✓</div>

          <div className="verification-content">
            <span className="verification-label">
              ADDITIONAL VERIFICATION REQUIRED
            </span>

            <h2>Was this transaction made by you?</h2>

            <p>
              Verify your identity using your device's biometric
              authentication before this transaction is approved.
            </p>
          </div>

          <button
            type="button"
            className="verify-button"
            onClick={handleVerification}
          >
            Verify transaction →
          </button>
        </section>

        <p className="details-disclaimer">
          SentinelPay provides behavioral risk signals and security
          checks. A high-risk score does not independently establish
          fraud. Final transaction handling requires user
          verification.
        </p>
      </main>
    </div>
  );
}

export default TransactionDetailsPage;
