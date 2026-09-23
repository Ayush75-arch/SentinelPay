import { useEffect, useMemo, useState } from "react";
import "./TransactionsPage.css";
import { getCurrentUserName, getUserTransactions } from "../api";

function riskLabel(riskLevel) {
  if (riskLevel === "HIGH") return "High";
  if (riskLevel === "MEDIUM") return "Medium";
  return "Low";
}

function TransactionsPage({ onNavigate }) {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [rawTransactions, setRawTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getUserTransactions()
      .then(setRawTransactions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const transactions = useMemo(
    () =>
      rawTransactions.map((t) => ({
        id: t.transaction_id,
        merchant: t.merchant_name,
        category: t.category,
        amount: t.amount,
        timestamp: new Date(t.timestamp).toLocaleString(),
        location:
          t.latitude != null && t.longitude != null
            ? `${t.latitude.toFixed(2)}, ${t.longitude.toFixed(2)}`
            : "Unknown",
        payment: t.payment_method,
        risk: riskLabel(t.risk?.risk_level),
        score: t.risk?.risk_score ?? 0,
      })),
    [rawTransactions]
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesSearch =
        transaction.merchant?.toLowerCase().includes(search.toLowerCase()) ||
        transaction.id?.toLowerCase().includes(search.toLowerCase());

      const matchesRisk = riskFilter === "All" || transaction.risk === riskFilter;

      const matchesCategory =
        categoryFilter === "All" || transaction.category === categoryFilter;

      return matchesSearch && matchesRisk && matchesCategory;
    });
  }, [transactions, search, riskFilter, categoryFilter]);

  const categories = [
    "All",
    ...new Set(transactions.map((transaction) => transaction.category)),
  ];

  const openTransactionDetails = (transactionId) => {
    onNavigate("transaction-details", transactionId);
  };

  const totalSpending = transactions.reduce((sum, t) => sum + t.amount, 0);
  const lowRiskCount = transactions.filter((t) => t.risk === "Low").length;
  const flaggedCount = transactions.filter((t) => t.risk !== "Low").length;

  return (
    <div className="transactions-page">
      <aside className="transactions-sidebar">
        <button
          type="button"
          className="transactions-logo"
          onClick={() => onNavigate("dashboard")}
        >
          <div className="transactions-logo-mark">S</div>

          <div>
            <strong>SentinelPay</strong>
            <span>Behavioral Security</span>
          </div>
        </button>

        <nav className="transactions-nav">
          <button type="button" onClick={() => onNavigate("dashboard")}>
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

          <button type="button" onClick={() => onNavigate("alerts")}>
            <span>!</span>
            Alerts
            {flaggedCount > 0 && <b>{flaggedCount}</b>}
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

        <div className="transactions-sidebar-bottom">
          <div className="transactions-protection">
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

      <main className="transactions-main">
        <header className="transactions-header">
          <div>
            <p className="transactions-eyebrow">TRANSACTION ACTIVITY</p>

            <h1>Transactions</h1>

            <p>
              Review your transaction history and see how SentinelPay
              evaluates each payment.
            </p>
          </div>

          <button
            type="button"
            className="transactions-profile"
            onClick={() => onNavigate("profile")}
          >
            <div className="transactions-notification">
              🔔
              <i></i>
            </div>

            <div className="transactions-avatar">J</div>

            <div>
              <strong>{getCurrentUserName()}</strong>
              <span>Protected account</span>
            </div>
          </button>
        </header>

        {loading && <p style={{ padding: "1rem" }}>Loading transactions…</p>}
        {error && (
          <p style={{ padding: "1rem", color: "#c0392b" }}>
            Couldn't load transactions: {error}
          </p>
        )}

        {!loading && !error && (
          <>
            <section className="transaction-summary">
              <div>
                <span>Total transactions</span>
                <strong>{transactions.length}</strong>
              </div>

              <div>
                <span>Total spending</span>
                <strong>₹{totalSpending.toLocaleString("en-IN")}</strong>
              </div>

              <div>
                <span>Low risk</span>
                <strong>{lowRiskCount}</strong>
              </div>

              <div>
                <span>Flagged</span>
                <strong>{flaggedCount}</strong>
                <small>Requires review</small>
              </div>
            </section>

            <section className="transactions-card">
              <div className="transactions-toolbar">
                <div className="transaction-search">
                  <span>⌕</span>

                  <input
                    type="text"
                    placeholder="Search merchant or transaction ID..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                <div className="transaction-filters">
                  <select
                    value={riskFilter}
                    onChange={(event) => setRiskFilter(event.target.value)}
                  >
                    <option value="All">All risk levels</option>
                    <option value="Low">Low risk</option>
                    <option value="Medium">Medium risk</option>
                    <option value="High">High risk</option>
                  </select>

                  <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category === "All" ? "All categories" : category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="transactions-count">
                Showing <strong>{filteredTransactions.length}</strong> transactions
              </div>

              <div className="full-transaction-table">
                <div className="full-table-head">
                  <span>Transaction</span>
                  <span>Category</span>
                  <span>Date & time</span>
                  <span>Location</span>
                  <span>Amount</span>
                  <span>Risk</span>
                  <span></span>
                </div>

                {filteredTransactions.map((transaction) => (
                  <div
                    className={`full-table-row ${
                      transaction.risk === "High" ? "high-risk-row" : ""
                    }`}
                    key={transaction.id}
                  >
                    <div className="transaction-name">
                      <div
                        className={`merchant-avatar ${transaction.risk.toLowerCase()}`}
                      >
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

                    <span className="transaction-date">{transaction.timestamp}</span>

                    <span className="transaction-location">
                      {transaction.location}
                    </span>

                    <strong className="transaction-value">
                      ₹{transaction.amount.toLocaleString("en-IN")}
                    </strong>

                    <div className="transaction-risk">
                      <span
                        className={`transaction-risk-pill ${transaction.risk.toLowerCase()}`}
                      >
                        {transaction.risk}
                      </span>

                      <small>{transaction.score}/100</small>
                    </div>

                    <button
                      type="button"
                      className="transaction-details-button"
                      aria-label={`View ${transaction.id}`}
                      onClick={() => openTransactionDetails(transaction.id)}
                    >
                      →
                    </button>
                  </div>
                ))}

                {filteredTransactions.length === 0 && (
                  <div className="empty-transactions">
                    <div>⌕</div>
                    <strong>No transactions found</strong>
                    <p>Try changing your search or filter settings.</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default TransactionsPage;
