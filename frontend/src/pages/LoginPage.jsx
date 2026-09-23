import { useState } from "react";
import "./LoginPage.css";
import { registerBiometric, authenticateBiometric } from "../webauthnClient";
import { login, register, requestPasswordReset, saveSession } from "../api";

function LoginPage({ onNavigate }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authMessage, setAuthMessage] = useState(null);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricError, setBiometricError] = useState(null);

  const handleLogin = async (event) => {
    event.preventDefault();
    setAuthError(null);
    setAuthMessage(null);
    setAuthBusy(true);
    try {
      const result = isRegistering
        ? await register(email, password, name)
        : await login(email, password);
      saveSession(result);
      onNavigate("dashboard");
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    setAuthError(null);
    setAuthMessage(null);
    if (!email.trim()) {
      setAuthError("Enter your email address first.");
      return;
    }
    setAuthBusy(true);
    try {
      const result = await requestPasswordReset(email);
      setAuthMessage(result.message);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleBiometricLogin = async () => {
    setBiometricError(null);
    setBiometricBusy(true);
    const userId = email.trim() || "demo_user_1";

    try {
      let sessionToken;
      try {
        // Try signing in with an existing credential first.
        sessionToken = await authenticateBiometric(userId);
      } catch (err) {
        // No credential registered yet for this user_id — register one
        // now. The backend returns 404 from authenticate/options in
        // that case (see webauthn_service.py's has_registered_credential
        // check).
        if (err.message.includes("404")) {
          const registrationResult = await registerBiometric(userId);
          sessionToken = registrationResult.token;
        } else {
          throw err;
        }
      }

      saveSession({ user_id: userId, token: sessionToken });
      onNavigate("dashboard");
    } catch (err) {
      setBiometricError(err.message);
    } finally {
      setBiometricBusy(false);
    }
  };

  return (
    <div className="login-page">
      {/* ==================== LEFT PANEL ==================== */}

      <section className="login-brand-panel">
        <button
          type="button"
          className="login-brand"
          onClick={() => onNavigate("landing")}
        >
          <div className="login-brand-icon">S</div>
          <span>
            Sentinel<span>Pay</span>
          </span>
        </button>

        <div className="login-panel-content">
          <span className="login-panel-tag">BEHAVIORAL FRAUD DETECTION</span>

          <h1>
            Your transactions.
            <span> Your behavior.</span>
            <br />
            Your protection.
          </h1>

          <p>
            SentinelPay learns your normal transaction behavior and helps
            identify activity that doesn't look like you.
          </p>

          <div className="login-protection-list">
            <div className="login-protection-item">
              <div className="protection-icon">✓</div>
              <div>
                <strong>Behavioral intelligence</strong>
                <span>Learn your normal spending patterns</span>
              </div>
            </div>

            <div className="login-protection-item">
              <div className="protection-icon">⌁</div>
              <div>
                <strong>Real-time risk analysis</strong>
                <span>Evaluate every transaction as it happens</span>
              </div>
            </div>

            <div className="login-protection-item">
              <div className="protection-icon">◉</div>
              <div>
                <strong>Layered security</strong>
                <span>Additional verification for suspicious activity</span>
              </div>
            </div>
          </div>
        </div>

        <div className="login-panel-footer">
          <span>SentinelPay</span>
          <span>Synexus Core Hackathon 2026</span>
        </div>
      </section>

      {/* ==================== LOGIN FORM ==================== */}

      <section className="login-form-panel">
        <div className="login-form-container">
          <div className="mobile-login-brand">
            <button
              type="button"
              className="login-brand"
              onClick={() => onNavigate("landing")}
            >
              <div className="login-brand-icon">S</div>
              <span>
                Sentinel<span>Pay</span>
              </span>
            </button>
          </div>

          <div className="login-heading">
            <span className="login-small-label">WELCOME BACK</span>

            <h2>{isRegistering ? "Create your SentinelPay account" : "Sign in to SentinelPay"}</h2>

            <p>{isRegistering ? "Start protecting your payment behavior." : "Access your transaction dashboard and behavioral insights."}</p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            {isRegistering && (
              <div className="form-field">
                <label htmlFor="name">Name</label>
                <div className="input-wrapper">
                  <input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="form-field">
              <label htmlFor="email">Email address</label>

              <div className="input-wrapper">
                <span className="input-icon">@</span>

                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <div className="password-label-row">
                <label htmlFor="password">Password</label>

                <button
                  type="button"
                  className="forgot-password"
                  onClick={handleForgotPassword}
                  disabled={authBusy}
                >
                  Forgot password?
                </button>
              </div>

              <div className="input-wrapper">
                <span className="input-icon">●</span>

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <label className="remember-row">
              <input type="checkbox" />

              <span>Remember me</span>
            </label>

            {authError && <p style={{ color: "#c0392b", fontSize: "11px" }}>{authError}</p>}
            {authMessage && <p style={{ color: "#2e8b57", fontSize: "11px" }}>{authMessage}</p>}

            <button type="submit" className="login-submit" disabled={authBusy}>
              {authBusy ? "Please wait..." : isRegistering ? "Create account" : "Sign in"}
              <span>→</span>
            </button>
          </form>

          <div className="login-divider">
            <span>or</span>
          </div>

          {biometricError && (
            <p style={{ color: "#c0392b", fontSize: "11px", marginBottom: "10px" }}>
              {biometricError}
            </p>
          )}

          <button
            type="button"
            className="biometric-login"
            onClick={handleBiometricLogin}
            disabled={biometricBusy}
          >
            <span className="biometric-icon">◉</span>

            <span>
              <strong>
                {biometricBusy ? "Waiting for device…" : "Continue with biometrics"}
              </strong>
              <small>Face ID, fingerprint or device authentication</small>
            </span>

            <span className="biometric-arrow">→</span>
          </button>

          <p className="login-signup">
            Don't have a SentinelPay account?
            <button
              type="button"
              onClick={() => {
                setAuthError(null);
                setIsRegistering((current) => !current);
              }}
            >
              {isRegistering ? "Already have an account? Sign in" : "Create account"}
            </button>
          </p>

          <div className="login-security-note">
            <span>✓</span>

            <p>
              Your biometric information stays on your device. SentinelPay
              only receives authentication results.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LoginPage;
