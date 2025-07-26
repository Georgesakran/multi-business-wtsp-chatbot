import React, { useContext } from "react";
import { LanguageProvider, LanguageContext } from "./context/LanguageContext";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { SlideFromTop } from "./utils/toastAnimations";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import OverviewPage from "./pages/OverviewPage"
import OwnerDashboard from "./pages/OwnerDashboard";
import BusinessesPage from "./pages/BusinessesPage";
import AddBusinessPage from "./pages/AddBusinessPage";
import OwnerSettingsPage from "./pages/OwnerSettingsPage";
import HomePage from "./pages/HomePage";
import BookingsPage from "./pages/BookingPage";
import CalendarView from "./pages/CalendarView";
import ConversationsPage from "./pages/ConversationsPage";
import ChatbotPage from "./pages/ChatbotPage";
import ServicesPage from "./pages/ServicesPage";
import FaqPage from "./pages/FaqPage";
import Layout from "./context/Layout";

import "./styles/Global.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Helper function
const getUser = () => JSON.parse(localStorage.getItem("user"));
const getToken = () => localStorage.getItem("token");

function ProtectedRoute({ children, role }) {
  const token = getToken();
  const user = getUser();

  if (!token) return <Navigate to="/login" />;
  if (role && user?.role !== role) return <Navigate to="/login" />;
  return children;
}

function AppContent() {
  const location = useLocation();
  const [collapsed, setCollapsed] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const justLoggedIn = localStorage.getItem("justLoggedIn") === "true";

    setCollapsed(isMobile || justLoggedIn);

    if (justLoggedIn) {
      localStorage.removeItem("justLoggedIn");
    }

    const handleResize = () => setCollapsed(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [location.pathname]);

  const isLoginPage = location.pathname === "/login";
  const isHomePage = location.pathname === "/";

  return (
    <>
      {!isLoginPage && !isHomePage ? (
        <Layout role={getUser()?.role} collapsed={collapsed} setCollapsed={setCollapsed}>
          <div className="main-content">
            <Routes>
              <Route path="/admin/Dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
              <Route path="/owner/Overview" element={<ProtectedRoute role="owner"><OverviewPage /></ProtectedRoute>} />
              <Route path="/owner/Dashboard" element={<ProtectedRoute role="owner"><OwnerDashboard /></ProtectedRoute>} />
              <Route path="/admin/add-business" element={<ProtectedRoute role="admin"><AddBusinessPage /></ProtectedRoute>} />
              <Route path="/admin/businesses" element={<ProtectedRoute role="admin"><BusinessesPage /></ProtectedRoute>} />
              <Route path="/owner/settings" element={<ProtectedRoute role="owner"><OwnerSettingsPage /></ProtectedRoute>} />              <Route path="/owner/services" element={<ProtectedRoute role="owner"><ServicesPage /></ProtectedRoute>} />
              <Route path="/owner/chatbot" element={<ProtectedRoute role="owner"><ChatbotPage /></ProtectedRoute>} />
              <Route path="/owner/faq" element={<ProtectedRoute role="owner"><FaqPage /></ProtectedRoute>} />
              <Route path="/owner/conversations" element={<ProtectedRoute role="owner"><ConversationsPage /></ProtectedRoute>} />

              <Route path="/owner/bookings" element={<ProtectedRoute role="owner"><BookingsPage /></ProtectedRoute>} />
              <Route path="/owner/calendar" element={<ProtectedRoute role="owner"><CalendarView /></ProtectedRoute>} />
              <Route path="/owner/services" element={<ProtectedRoute role="owner"><ServicesPage /></ProtectedRoute>} />
            </Routes>
          </div>
        </Layout>
      ) : (
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      )}
    </>
  );
}

// ✅ Wrapper for context + router + toast
function AppWithProviders() {
  return (
    <LanguageProvider>
      <Router>
        <AppContent />
        <ToastWrapper />
      </Router>
    </LanguageProvider>
  );
}

// ✅ Toast with direction + styling
function ToastWrapper() {
  const { language } = useContext(LanguageContext);

  return (
    <ToastContainer
      className={`toast-container-custom ${["ar", "he"].includes(language) ? "rtl" : "ltr"}`}
      position="top-center"
      autoClose={7000}
      hideProgressBar={false}
      newestOnTop={true}
      closeOnClick={true}
      pauseOnFocusLoss={false}
      draggable
      pauseOnHover
      theme="light"
      transition={SlideFromTop}
    />
  );
}

export default AppWithProviders;