const features = [
  ["purple", "◎", "Behavior-aware detection", "Build a personal baseline that understands normal spending—not just generic fraud rules.", "large-feature", "behavior"],
  ["blue", "⚡", "Real-time risk decisions", "Score each payment as it arrives and explain exactly what changed."],
  ["green", "⌖", "Location intelligence", "Compare activity against the places where you normally transact."],
  ["orange", "◇", "Merchant context", "Recognize familiar merchants and surface unexpected payment behavior."],
  ["red", "◉", "Biometric confirmation", "Ask for device-backed confirmation when a high-risk payment needs review."],
  ["purple", "✈", "Travel Mode", "Reduce location sensitivity while travelling; every other security check stays active.", "large-feature", "travel"],
];

function Features() {
  return <section className="features-section section-padding" id="features"><div className="landing-container"><div className="section-heading centered"><span className="section-tag">PROTECTION, EXPLAINED</span><h2>One intelligent layer.<span> Every payment protected.</span></h2><p>SentinelPay combines behavioral intelligence with deterministic security checks, so risk decisions are fast, personal and understandable.</p></div><div className="features-grid">{features.map(([color, icon, title, text, size = "", visual]) => <div className={`feature-card ${size}`.trim()} key={title}><div className={`feature-icon ${color}`}>{icon}</div><h3>{title}</h3><p>{text}</p>{visual === "behavior" && <div className="feature-visual"><div className="behavior-line">{Array.from({ length: 5 }, (_, index) => <span key={index} />)}</div></div>}{visual === "travel" && <div className="travel-preview"><div className="travel-dot" /><div className="travel-line" /><div className="travel-dot active" /></div>}</div>)}</div></div></section>;
}

export default Features;
