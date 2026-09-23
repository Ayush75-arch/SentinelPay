import { useState } from "react";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import TransactionsPage from "./pages/TransactionsPage";
import TransactionDetailsPage from "./pages/TransactionDetailsPage";
import AlertsPage from "./pages/AlertsPage";
import LocationActivityPage from "./pages/LocationActivityPage";
import ProfilePage from "./pages/ProfilePage";
import TravelModePage from "./pages/TravelModePage";

function App() {
  const [currentPage, setCurrentPage] = useState("landing");
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);

  const navigate = (page, transactionId = null) => {
    if (page === "landing") {
      localStorage.removeItem("sentinelpay_user_id");
      localStorage.removeItem("sentinelpay_session_token");
      localStorage.removeItem("sentinelpay_user_name");
    }
    if (page === "transaction-details" && transactionId) {
      setSelectedTransactionId(transactionId);
    }
    setCurrentPage(page);
  };

  switch (currentPage) {
    case "login":
      return <LoginPage onNavigate={navigate} />;

    case "dashboard":
      return <DashboardPage onNavigate={navigate} />;

    case "transactions":
      return <TransactionsPage onNavigate={navigate} />;

    case "transaction-details":
      return <TransactionDetailsPage onNavigate={navigate} transactionId={selectedTransactionId} />;

    case "alerts":
      return <AlertsPage onNavigate={navigate} />;

    case "location":
      return <LocationActivityPage onNavigate={navigate} />;

    case "profile":
      return <ProfilePage onNavigate={navigate} />;

    case "travel-mode":
      return <TravelModePage onNavigate={navigate} />;

    default:
      return <LandingPage onNavigate={navigate} />;
  }
}

export default App;
