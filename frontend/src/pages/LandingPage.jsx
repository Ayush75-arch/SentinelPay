import "./LandingPage.css";
import About from "./landing/About";
import Cta from "./landing/Cta";
import Features from "./landing/Features";
import Footer from "./landing/Footer";
import Hero from "./landing/Hero";
import HowItWorks from "./landing/HowItWorks";
import LandingNavbar from "./landing/LandingNavbar";
import Team from "./landing/Team";

function LandingPage({ onNavigate }) {
  return (
    <div className="landing-page">
      {/* ==================== NAVBAR ==================== */}
      <LandingNavbar onNavigate={onNavigate} />
      <main>
        {/* ==================== HERO ==================== */}
        <Hero onNavigate={onNavigate} />
        {/* ==================== ABOUT ==================== */}
        <About />
        {/* ==================== HOW IT WORKS ==================== */}
        <HowItWorks />
        {/* ==================== FEATURES ==================== */}
        <Features />
        {/* ==================== TEAM ==================== */}
        <Team />
        {/* ==================== CTA ==================== */}
        <Cta onNavigate={onNavigate} />
      </main>
      {/* ==================== FOOTER ==================== */}
      <Footer />
    </div>
  );
}

export default LandingPage;
