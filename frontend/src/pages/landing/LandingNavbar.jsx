function LandingNavbar({ onNavigate }) {
  return (
    <header className="landing-navbar">
      <div className="landing-container navbar-inner">
        <a href="#home" className="brand">
          <div className="brand-icon">S</div>
          <span>
            Sentinel<span>Pay</span>
          </span>
        </a>

        <nav className="desktop-nav">
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
        </nav>

        <div className="navbar-actions">
          <button
            type="button"
            className="login-link"
            onClick={() => onNavigate("login")}
          >
            Login
          </button>

          <button
            type="button"
            className="nav-cta"
            onClick={() => onNavigate("login")}
          >
            Get started
          </button>
        </div>
      </div>
    </header>
  );
}

export default LandingNavbar;