const signals = [["₹", "Amount", "Recognizes your typical spend and surfaces meaningful amount changes."], ["◷", "Time", "Learns when you normally pay and flags unexpected timing."], ["⌖", "Location", "Compares payment locations with your normal activity areas."], ["◇", "Merchant", "Distinguishes familiar merchants from genuinely new behavior."]];

function About() {
  return <section className="about-section section-padding" id="about"><div className="landing-container"><div className="section-heading centered"><span className="section-tag">BUILT AROUND YOU</span><h2>Fraud protection that learns<span> how you spend.</span></h2><p>SentinelPay does more than ask whether a payment is unusual. It asks whether that payment is unusual for you.</p></div><div className="signal-grid">{signals.map(([icon, title, text]) => <div className="signal-card" key={title}><div className="signal-card-icon">{icon}</div><h3>{title}</h3><p>{text}</p></div>)}</div></div></section>;
}

export default About;
