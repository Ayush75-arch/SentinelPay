import { useEffect, useState } from "react";
import "./LocationActivityPage.css";
import { getCurrentUserName, getLocationActivity } from "../api";

function LocationActivityPage({ onNavigate }) {
  const [locationData, setLocationData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getLocationActivity().then(setLocationData).catch((err) => setError(err.message));
  }, []);

  const locations = locationData?.locations ?? [];
  const recentActivity = locationData?.recent_activity ?? [];

  return (
    <div className="location-page">
      <aside className="location-sidebar">
        <button
          type="button"
          className="location-logo"
          onClick={() => onNavigate("dashboard")}
        >
          <div className="location-logo-mark">S</div>

          <div>
            <strong>SentinelPay</strong>
            <span>Behavioral Security</span>
          </div>
        </button>

        <nav className="location-nav">
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
            className="active"
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

        <div className="location-sidebar-bottom">
          <div className="location-protection">
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

      <main className="location-main">
        <header className="location-header">
          <div>
            <p className="location-eyebrow">BEHAVIORAL SIGNAL</p>

            <h1>Location Activity</h1>

            <p>
              Review the locations associated with your recent
              transactions and behavioral baseline.
            </p>
          </div>

          <button
            type="button"
            className="location-profile"
            onClick={() => onNavigate("profile")}
          >
            <div className="location-avatar">J</div>

            <div>
              <strong>{getCurrentUserName()}</strong>
              <span>Protected account</span>
            </div>
          </button>
        </header>

        {error && <p style={{ color: "#c0392b" }}>{error}</p>}

        <section className="location-summary">
          <div className="location-summary-card">
            <div className="summary-icon">⌖</div>

            <div>
              <span>Primary location</span>
              <strong>{locationData?.primary_location ?? "Loading..."}</strong>
              <small>{locationData?.primary_percentage ?? 0}% of recent activity</small>
            </div>
          </div>

          <div className="location-summary-card">
            <div className="summary-icon">◉</div>

            <div>
              <span>Locations observed</span>
              <strong>{locationData?.locations_observed ?? 0}</strong>
              <small>Last 30 days</small>
            </div>
          </div>

          <div className="location-summary-card">
            <div className="summary-icon secure">✓</div>

            <div>
              <span>Location protection</span>
              <strong>Active</strong>
              <small>Used as a risk signal</small>
            </div>
          </div>
        </section>

        <section className="location-content-grid">
          <div className="location-map-card">
            <div className="location-card-header">
              <div>
                <p>ACTIVITY MAP</p>
                <h2>Recent transaction locations</h2>
              </div>

              <span>Last 30 days</span>
            </div>

            <div className="location-map">
              <div className="map-grid"></div>

              <div className="map-road road-one"></div>
              <div className="map-road road-two"></div>
              <div className="map-road road-three"></div>

              {locations.slice(0, 4).map((location, index) => (
                <div className={`map-marker marker-${index}`} key={location.name}>
                  <span></span>
                  <strong>{location.name}</strong>
                </div>
              ))}

              <div className="map-center-label">
                <strong>Location activity</strong>
                <span>{locations.length ? "Observed transaction locations" : "No location data yet"}</span>
              </div>
            </div>

            <div className="map-note">
              <span>i</span>

              <p>
                Location is one behavioral signal. SentinelPay
                combines it with amount, time and merchant behavior
                before generating a risk decision.
              </p>
            </div>
          </div>

          <div className="location-card locations-card">
            <div className="location-card-header">
              <div>
                <p>BEHAVIORAL BASELINE</p>
                <h2>Known locations</h2>
              </div>
            </div>

            <div className="known-location-list">
              {locations.map((location) => (
                <div
                  className="known-location"
                  key={location.name}
                >
                  <div className="known-location-icon">⌖</div>

                  <div className="known-location-info">
                    <strong>{location.name}</strong>
                    <span>{location.status}</span>

                    <div className="location-progress">
                      <div
                        style={{
                          width: `${location.percentage}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="known-location-count">
                    <strong>{location.transactions}</strong>
                    <span>tx</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="location-card recent-location-card">
          <div className="location-card-header">
            <div>
              <p>RECENT ACTIVITY</p>
              <h2>Transactions by location</h2>
            </div>

            <button
              type="button"
              onClick={() => onNavigate("transactions")}
            >
              View transactions →
            </button>
          </div>

          <div className="location-activity-list">
            {recentActivity.map((activity) => (
              <div
                className="location-activity-row"
                key={`${activity.merchant}-${activity.time}`}
              >
                <div className="activity-location-icon">⌖</div>

                <div className="activity-location-info">
                  <strong>{activity.merchant}</strong>

                  <span>
                    {activity.location} · {activity.time}
                  </span>
                </div>

                <strong className="activity-amount">
                  ₹{activity.amount.toLocaleString("en-IN")}
                </strong>

                <span
                  className={`activity-status ${
                    activity.status === "Flagged"
                      ? "flagged"
                      : ""
                  }`}
                >
                  {activity.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="location-privacy-note">
          <div>i</div>

          <p>
            <strong>Location privacy.</strong>{" "}
            Location data is treated as a behavioral security signal.
            Optional external location history, such as Google
            Timeline data, should only be connected with explicit
            user consent.
          </p>
        </section>
      </main>
    </div>
  );
}

export default LocationActivityPage;