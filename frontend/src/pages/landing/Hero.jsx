function Hero({ onNavigate }) {
  const signals = [["Usual time", "Normal"], ["Known location", "Trusted"], ["Expected amount", "Normal"], ["Recognized merchant", "Trusted"]];
  return (
    <section className="hero-section" id="home">
      <div className="landing-container hero-grid">
        <div className="hero-content">
          <div className="eyebrow"><span className="eyebrow-dot" />INTELLIGENT PAYMENT PROTECTION</div>
          <h1>Know every payment.<span> Trust every decision.</span></h1>
          <p className="hero-description">SentinelPay learns your normal spending patterns—amounts, timing, locations and merchants—then turns machine learning and live security checks into a clear, explainable risk decision.</p>
          <div className="hero-buttons">
            <button type="button" className="primary-button" onClick={() => onNavigate("login")}>Protect my account <span>→</span></button>
            <a href="#how-it-works" className="secondary-button">Explore the protection</a>
          </div>
          <div className="hero-trust">
            <div className="trust-item"><strong>4</strong><span>Behavior signals</span></div><div className="trust-divider" />
            <div className="trust-item"><strong>ML</strong><span>Personalized scoring</span></div><div className="trust-divider" />
            <div className="trust-item"><strong>24/7</strong><span>Live monitoring</span></div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="glow-orb" />
          <div className="risk-card">
            <div className="risk-card-top"><div><span className="card-label">LIVE PROTECTION STATUS</span><h3>Transaction health</h3></div><div className="shield-icon">✓</div></div>
            <div className="risk-score"><div className="score-ring"><div className="score-ring-inner"><strong>94</strong><span>/100</span></div></div><div className="risk-status"><span className="status-dot" /><strong>LOW RISK</strong><p>This payment matches your usual behavior.</p></div></div>
            <div className="signal-list">{signals.map(([label, status]) => <div className="signal-row" key={label}><span className="signal-check">✓</span><span>{label}</span><small>{status}</small></div>)}</div>
            <div className="transaction-count"><div><strong>248</strong><span>payments protected this month</span></div><div className="mini-bars">{Array.from({ length: 7 }, (_, index) => <i key={index} />)}</div></div>
          </div>
          <div className="floating-card floating-card-one"><span className="floating-icon">✓</span><div><strong>Protected</strong><small>Behavior matches your baseline</small></div></div>
          <div className="floating-card floating-card-two"><span className="floating-icon">⌁</span><div><strong>4 signals checked</strong><small>Amount · Time · Place · Merchant</small></div></div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
