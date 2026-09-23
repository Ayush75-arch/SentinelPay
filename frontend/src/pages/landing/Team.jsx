const members = [["avatar-a", "A", "ML & BEHAVIORAL INTELLIGENCE", "Ayush", "Personal baselines, feature engineering and explainable anomaly scoring.", ""], ["avatar-b", "J", "PRODUCT BACKEND & INTEGRATION", "Jeswin", "The transaction pipeline, risk decisions and the connected SentinelPay experience.", "featured-team"], ["avatar-c", "C", "SECURITY & TRUST", "Avi", "Real-time security checks, biometric confirmation and Travel Mode protections.", ""]];

function Team() {
  return <section className="team-section section-padding" id="team"><div className="landing-container"><div className="section-heading centered"><span className="section-tag">THE TEAM</span><h2>Three layers.<span> One system.</span></h2><p>SentinelPay brings together behavioral intelligence, backend integration and security engineering.</p></div><div className="team-grid">{members.map(([avatar, initial, role, name, text, className]) => <div className={`team-card ${className}`.trim()} key={name}><div className={`team-avatar ${avatar}`}>{initial}</div><span className="team-role">{role}</span><h3>{name}</h3><p>{text}</p></div>)}</div></div></section>;
}

export default Team;
