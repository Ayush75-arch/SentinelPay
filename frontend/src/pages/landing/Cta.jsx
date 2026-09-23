function Cta({ onNavigate }) {
  return <section className="cta-section"><div className="landing-container"><div className="cta-card"><div className="cta-content"><span className="section-tag">SENTINELPAY PROTECTION</span><h2>See every payment<span> with more confidence.</span></h2><p>Understand your behavioral baseline, track risk decisions and respond quickly when a payment needs your attention.</p><button type="button" className="primary-button light-button" onClick={() => onNavigate("login")}>Open my security dashboard <span>→</span></button></div><div className="cta-orbit"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-center"><strong>94</strong><span>LOW RISK</span></div></div></div></div></section>;
}

export default Cta;
