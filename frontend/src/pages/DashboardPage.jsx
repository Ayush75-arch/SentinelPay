import { useEffect, useState } from "react";
import "./DashboardPage.css";
import { getCurrentUserName, getSpendingSummary, getUserTransactions, runDemoScenario, seedDemoTransactions } from "../api";

const demoScenarios = [
  ["normal", "Normal"],
  ["location-anomaly", "Location anomaly"],
  ["amount-anomaly", "Amount anomaly"],
  ["time-anomaly", "Time anomaly"],
  ["merchant-anomaly", "Merchant anomaly"],
  ["shadow-subscription", "Shadow subscription"],
  ["multi-signal", "Multi-signal fraud"],
];

function DashboardPage({ onNavigate }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [spendingData, setSpendingData] = useState([]);
  const [demoResult, setDemoResult] = useState(null);

  useEffect(() => {
    Promise.all([getUserTransactions(), getSpendingSummary()])
      .then(([userTransactions, summary]) => {
        setTransactions(userTransactions);
        setSpendingData(summary);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const highRiskCount = transactions.filter(
    (t) => t.risk?.risk_level === "HIGH"
  ).length;

  const totalAmount = transactions.reduce(
    (sum, t) => sum + (t.amount ?? 0),
    0
  );

  // Displayed as a "safety" score — inverse of the most recent
  // transaction's risk_score (0-100, higher risk_score = more unusual).
  const latestSafetyScore =
    transactions.length > 0
      ? Math.round(100 - (transactions[transactions.length - 1].risk?.risk_score ?? 0))
      : 100;

  const stats = [
    {
      label: "Risk Score",
      value: `${latestSafetyScore}/100`,
      status: latestSafetyScore > 70 ? "LOW RISK" : "NEEDS ATTENTION",
      type: "risk",
    },
    {
      label: "Transactions",
      value: String(transactions.length),
      status: "This month",
      type: "normal",
    },
    {
      label: "Alerts",
      value: String(highRiskCount),
      status: highRiskCount > 0 ? "Needs attention" : "All clear",
      type: "warning",
    },
    {
      label: "Protected Amount",
      value: `₹${totalAmount.toLocaleString("en-IN")}`,
      status: "This month",
      type: "protected",
    },
  ];

  const recentTransactions = transactions.slice(0, 5).map((t) => ({
    id: t.transaction_id,
    merchant: t.merchant_name,
    category: t.category,
    amount: `₹${(t.amount ?? 0).toLocaleString("en-IN")}`,
    time: new Date(t.timestamp).toLocaleString(),
    risk:
      t.risk?.risk_level === "HIGH"
        ? "High"
        : t.risk?.risk_level === "MEDIUM"
        ? "Medium"
        : "Low",
  }));

  const chartMaximum = Math.max(...spendingData.map((item) => item.amount), 1);

  const topAlert = transactions.find((t) => t.risk?.risk_level === "HIGH");

  const loadDemoTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      await seedDemoTransactions();
      const [userTransactions, summary] = await Promise.all([
        getUserTransactions(),
        getSpendingSummary(),
      ]);
      setTransactions(userTransactions);
      setSpendingData(summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadScenario = async (scenario) => {
    setLoading(true);
    setError(null);
    try {
      const result = await runDemoScenario(scenario);
      setDemoResult(result);
      const [userTransactions, summary] = await Promise.all([getUserTransactions(), getSpendingSummary()]);
      setTransactions(userTransactions);
      setSpendingData(summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-page">
      <aside className="dashboard-sidebar">
        <button
          type="button"
          className="dashboard-logo"
          onClick={() => onNavigate("dashboard")}
        >
          <div className="logo-mark">S</div>

          <div>
            <strong>SentinelPay</strong>
            <span>Behavioral Security</span>
          </div>
        </button>

        <nav className="dashboard-nav">
          <button
            type="button"
            className="nav-item active"
            onClick={() => onNavigate("dashboard")}
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            type="button"
            className="nav-item"
            onClick={() => onNavigate("transactions")}
          >
            <span>↔</span>
            Transactions
          </button>

          <button
            type="button"
            className="nav-item"
            onClick={() => onNavigate("alerts")}
          >
            <span>!</span>
            Alerts
            {highRiskCount > 0 && (
              <span className="nav-badge">{highRiskCount}</span>
            )}
          </button>

          <button
            type="button"
            className="nav-item"
            onClick={() => onNavigate("location")}
          >
            <span>⌖</span>
            Location Activity
          </button>

          <button
            type="button"
            className="nav-item"
            onClick={() => onNavigate("travel-mode")}
          >
            <span>✈</span>
            Travel Mode
          </button>

          <button
            type="button"
            className="nav-item"
            onClick={() => onNavigate("profile")}
          >
            <span>◯</span>
            Profile
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="security-status">
            <span className="status-dot"></span>

            <div>
              <strong>Protection active</strong>
              <span>SentinelPay is monitoring</span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-logout"
            onClick={() => onNavigate("landing")}
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">OVERVIEW</p>
            <h1>Your payment protection is active.</h1>
            <p className="dashboard-subtitle">
              See recent decisions, emerging risk and the signals protecting every payment.
            </p>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="notification-button"
              aria-label="Notifications"
              onClick={() => onNavigate("alerts")}
            >
              🔔
              <span></span>
            </button>

            <button
              type="button"
              className="profile-chip"
              onClick={() => onNavigate("profile")}
            >
              <div className="profile-avatar">J</div>

              <div>
                <strong>{getCurrentUserName()}</strong>
                <span>Protected account</span>
              </div>
            </button>
          </div>
        </header>

        <section className="demo-panel">
          <div>
            <p className="card-label">JUDGE DEMO</p>
            <h2>Run a real transaction through the risk engine</h2>
            <p>Each button seeds the same baseline and submits one deterministic transaction.</p>
          </div>
          <div className="demo-actions">
            {demoScenarios.map(([scenario, label]) => (
              <button type="button" className={scenario === "multi-signal" ? "demo-button danger" : "demo-button"} key={scenario} onClick={() => loadScenario(scenario)}>
                {label}
              </button>
            ))}
          </div>
        </section>

        {demoResult && (
          <section className={`demo-result ${demoResult.risk.risk_level.toLowerCase()}`}>
            <div>
              <span className="card-label">LATEST DECISION</span>
              <strong>{demoResult.risk.risk_level} · {demoResult.risk.recommended_action}</strong>
              <span>Risk score {demoResult.risk.risk_score}/100</span>
            </div>
            <div className="demo-signals">
              {Object.entries(demoResult.risk.behavioral_signals).filter(([key]) => key !== "personal_anomaly").map(([key, value]) => (
                <span key={key}>{key.replace("_anomaly", "").replace("_", " ")} <b>{Math.round(value * 100)}%</b></span>
              ))}
            </div>
            <ul>{demoResult.risk.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          </section>
        )}

        {loading && <p style={{ padding: "1rem" }}>Loading your transactions…</p>}
        {error && (
          <p style={{ padding: "1rem", color: "#c0392b" }}>
            Couldn't load transactions: {error}
          </p>
        )}

        {!loading && !error && (
          <>
            <section className="stats-grid">
              {stats.map((stat) => (
                <article className={`stat-card ${stat.type}`} key={stat.label}>
                  <div className="stat-card-top">
                    <span>{stat.label}</span>

                    <div className="stat-icon">
                      {stat.type === "risk" && "✓"}
                      {stat.type === "normal" && "↔"}
                      {stat.type === "warning" && "!"}
                      {stat.type === "protected" && "₹"}
                    </div>
                  </div>

                  <strong className="stat-value">{stat.value}</strong>

                  <span className="stat-status">{stat.status}</span>
                </article>
              ))}
            </section>

            <section className="dashboard-grid">
              <article className="dashboard-card spending-card">
                <div className="card-header">
                  <div>
                    <p className="card-label">SPENDING ACTIVITY</p>
                    <h2>Weekly spending</h2>
                  </div>

                  <button type="button" className="period-button">
                    Last 7 days ▾
                  </button>
                </div>

                <div className="spending-total">
                  <strong>₹{totalAmount.toLocaleString("en-IN")}</strong>
                </div>

                <div className="chart">
                  {spendingData.map((item) => (
                    <div className="chart-column" key={item.day}>
                      <div className="chart-value">₹{item.amount}</div>

                      <div className="chart-bar-wrapper">
                        <div
                          className="chart-bar"
                          style={{
                            height: `${item.amount ? Math.max(18, (item.amount / chartMaximum) * 100) : 0}%`,
                          }}
                        ></div>
                      </div>

                      <span>{item.day}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="dashboard-card risk-card">
                <div className="card-header">
                  <div>
                    <p className="card-label">BEHAVIORAL HEALTH</p>
                    <h2>Your baseline</h2>
                  </div>

                  <span className="healthy-pill">
                    {latestSafetyScore > 70 ? "Healthy" : "Review needed"}
                  </span>
                </div>

                <div className="risk-score-display">
                  <div className="score-circle">
                    <strong>{latestSafetyScore}</strong>
                    <span>/100</span>
                  </div>

                  <div>
                    <strong>
                      {latestSafetyScore > 70
                        ? "Low anomaly activity"
                        : "Recent unusual activity"}
                    </strong>

                    <p>
                      Based on your {transactions.length} most recent
                      transactions.
                    </p>
                  </div>
                </div>
              </article>
            </section>

            <section className="dashboard-card transactions-card">
              <div className="card-header">
                <div>
                  <p className="card-label">TRANSACTION ACTIVITY</p>
                  <h2>Recent transactions</h2>
                </div>

                <button
                  type="button"
                  className="view-all-button"
                  onClick={() => onNavigate("transactions")}
                >
                  View all →
                </button>
              </div>

              <div className="transaction-table">
                <div className="transaction-table-head">
                  <span>Transaction</span>
                  <span>Category</span>
                  <span>Time</span>
                  <span>Amount</span>
                  <span>Risk</span>
                </div>

                {recentTransactions.map((transaction) => (
                  <button
                    type="button"
                    className="transaction-row"
                    key={transaction.id}
                    onClick={() => onNavigate("transaction-details", transaction.id)}
                  >
                    <div className="transaction-merchant">
                      <div className="merchant-icon">
                        {transaction.merchant?.charAt(0)}
                      </div>

                      <div>
                        <strong>{transaction.merchant}</strong>
                        <span>{transaction.id}</span>
                      </div>
                    </div>

                    <span className="transaction-category">
                      {transaction.category}
                    </span>

                    <span className="transaction-time">{transaction.time}</span>

                    <strong className="transaction-amount">
                      {transaction.amount}
                    </strong>

                    <span
                      className={`risk-pill ${transaction.risk.toLowerCase()}`}
                    >
                      {transaction.risk}
                    </span>
                  </button>
                ))}

                {recentTransactions.length === 0 && (
                  <div style={{ padding: "1rem" }}>
                    <p>No transactions yet.</p>
                    <button type="button" className="view-all-button" onClick={loadDemoTransactions}>
                      Load demo transactions
                    </button>
                  </div>
                )}
              </div>
            </section>

            {topAlert && (
              <section className="alert-banner">
                <div className="alert-icon">!</div>

                <div>
                  <strong>1 transaction needs your attention</strong>

                  <p>
                    SentinelPay detected an unusual ₹
                    {topAlert.amount.toLocaleString("en-IN")} transaction from{" "}
                    {topAlert.merchant_name}.
                  </p>
                </div>

                <button
                  type="button"
                  className="alert-button"
                  onClick={() => onNavigate("alerts")}
                >
                  Review alert →
                </button>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default DashboardPage;
