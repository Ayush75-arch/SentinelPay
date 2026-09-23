import { useEffect, useState } from "react";
import "./ProfilePage.css";
import { getCurrentUserName, getProfile } from "../api";

function ProfilePage({ onNavigate }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getProfile().then(setProfile).catch((err) => setError(err.message));
  }, []);

  const behavioralData = profile
    ? [
        { label: "Typical transaction", value: profile.typical_transaction, description: "Based on your transaction history" },
        { label: "Usual transaction time", value: profile.usual_transaction_time, description: "Your most common spending window" },
        { label: "Primary location", value: profile.primary_location, description: "Most transactions originate here" },
        { label: "Frequent merchants", value: profile.frequent_merchants, description: "Frequently observed merchants" },
      ]
    : [];
  const categories = profile?.categories ?? [];

  return (
    <div className="profile-page">
      <aside className="profile-sidebar">
        <button
          type="button"
          className="profile-logo"
          onClick={() => onNavigate("dashboard")}
        >
          <div className="profile-logo-mark">S</div>

          <div>
            <strong>SentinelPay</strong>
            <span>Behavioral Security</span>
          </div>
        </button>

        <nav className="profile-nav">
          <button
            type="button"
            onClick={() => onNavigate("dashboard")}
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            type="button"
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
            className="active"
            onClick={() => onNavigate("profile")}
          >
            <span>◯</span>
            Profile
          </button>
        </nav>

        <div className="profile-sidebar-bottom">
          <div className="profile-protection">
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

      <main className="profile-main">
        <header className="profile-header">
          <div>
            <p className="profile-eyebrow">ACCOUNT</p>

            <h1>Profile</h1>

            <p>
              Manage your account and understand the behavioral
              patterns SentinelPay uses to protect you.
            </p>
          </div>

          {error && <p style={{ color: "#c0392b" }}>{error}</p>}

          <button
            type="button"
            className="profile-user"
            onClick={() => onNavigate("profile")}
          >
            <div className="profile-avatar">J</div>

            <div>
              <strong>{getCurrentUserName()}</strong>
              <span>Protected account</span>
            </div>
          </button>
        </header>

        <section className="profile-overview">
          <div className="profile-card profile-identity">
            <div className="profile-large-avatar">{profile?.name?.charAt(0) ?? "?"}</div>

            <div className="profile-identity-info">
              <span className="profile-label">
                PERSONAL PROFILE
              </span>

              <h2>{profile?.name ?? "Loading profile..."}</h2>

              <p>{profile?.email ?? ""}</p>

              <span className="profile-status">
                <i></i>
                Account protected
              </span>
            </div>

            <button
              type="button"
              className="profile-edit-button"
              onClick={() => console.log("Edit profile selected")}
            >
              Edit profile
            </button>
          </div>

          <div className="profile-card protection-card">
            <div className="protection-icon">✓</div>

            <div>
              <span className="profile-label">
                ACCOUNT SECURITY
              </span>

              <h3>Protection is active</h3>

              <p>
                SentinelPay is monitoring your transactions and
                checking them against your behavioral baseline.
              </p>
            </div>
          </div>
        </section>

        <section className="profile-section">
          <div className="profile-section-heading">
            <div>
              <p>BEHAVIORAL INTELLIGENCE</p>

              <h2>Your behavioral baseline</h2>

              <span>
                SentinelPay learns your normal transaction patterns
                to identify unusual activity.
              </span>
            </div>

            <div className="baseline-status">
              <i></i>
              Learning active
            </div>
          </div>

          <div className="behavior-grid">
            {behavioralData.map((item) => (
              <div className="behavior-card" key={item.label}>
                <span>{item.label}</span>

                <strong>{item.value}</strong>

                <small>{item.description}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="profile-columns">
          <div className="profile-card">
            <div className="card-heading">
              <div>
                <p>SPENDING PATTERN</p>
                <h2>Transaction categories</h2>
              </div>

              <span>Last 30 days</span>
            </div>

            <div className="category-list">
              {categories.map((category) => (
                <div className="category-row" key={category.name}>
                  <div className="category-row-top">
                    <span>{category.name}</span>
                    <strong>{category.percentage}%</strong>
                  </div>

                  <div className="category-track">
                    <div
                      style={{
                        width: `${category.percentage}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="profile-card">
            <div className="card-heading">
              <div>
                <p>DEVICES</p>
                <h2>Trusted devices</h2>
              </div>
            </div>

            <div className="device-row">
              <div className="device-icon">▣</div>

              <div>
                <strong>Current device</strong>
                <span>Windows · Chrome</span>
              </div>

              <b>Trusted</b>
            </div>

            <div className="device-row">
              <div className="device-icon">◉</div>

              <div>
                <strong>Mobile device</strong>
                <span>Android</span>
              </div>

              <b>Trusted</b>
            </div>

            <p className="device-note">
              Device information is used as one of several security
              signals during transaction analysis.
            </p>
          </div>
        </section>

        <section className="profile-card learning-card">
          <div className="learning-icon">✦</div>

          <div>
            <p>HOW SENTINELPAY LEARNS</p>

            <h2>
              Your baseline becomes more accurate over time
            </h2>

            <p>
              SentinelPay looks at transaction amount, time,
              location and merchant behavior. As more legitimate
              transactions are observed, the behavioral baseline can
              adapt to changes in your normal spending.
            </p>
          </div>
        </section>

        <section className="profile-columns">
          <div className="profile-card">
            <div className="card-heading">
              <div>
                <p>SECURITY SETTINGS</p>
                <h2>Account protection</h2>
              </div>
            </div>

            <div className="setting-row">
              <div>
                <strong>Biometric verification</strong>
                <span>
                  Use device authentication for high-risk
                  transactions.
                </span>
              </div>

              <span className="setting-enabled">Enabled</span>
            </div>

            <div className="setting-row">
              <div>
                <strong>Real-time monitoring</strong>
                <span>
                  Analyze transactions as they occur.
                </span>
              </div>

              <span className="setting-enabled">Enabled</span>
            </div>

            <div className="setting-row">
              <div>
                <strong>Travel Mode</strong>
                <span>
                  Temporarily reduce location sensitivity while
                  travelling.
                </span>
              </div>

              <button
                type="button"
                className="setting-action"
                onClick={() => onNavigate("travel-mode")}
              >
                Manage
              </button>
            </div>
          </div>

          <div className="profile-card profile-travel-card">
            <div className="travel-card-icon">✈</div>

            <div>
              <p>TRAVEL MODE</p>

              <h2>Going somewhere?</h2>

              <span>
                Tell SentinelPay when you're travelling so location
                changes don't unnecessarily trigger alerts.
              </span>

              <button
                type="button"
                onClick={() => onNavigate("travel-mode")}
              >
                Open Travel Mode →
              </button>
            </div>
          </div>
        </section>

        <section className="profile-security-note">
          <div>i</div>

          <p>
            <strong>Privacy by design.</strong>{" "}
            SentinelPay uses behavioral signals to detect anomalies.
            Biometric credentials remain managed by your device
            through WebAuthn and are not stored by SentinelPay.
          </p>
        </section>
      </main>
    </div>
  );
}

export default ProfilePage;