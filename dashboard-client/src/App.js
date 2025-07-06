import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import { LanguageProvider } from "./context/LanguageContext";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import OwnerDashboard from "./pages/OwnerDashboard";
import BusinessesPage from "./pages/BusinessesPage";
import AddBusinessPage from "./pages/AddBusinessPage";
import OwnerSettingsPage from "./pages/OwnerSettingsPage";
import HomePage from "./pages/HomePage";
import BookingsPage from "./pages/BookingPage";
import CalendarView from "./pages/CalendarView";
import ServicesPage from "./pages/ServicesPage";
import Layout from "./context/Layout";
import "./styles/Global.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Helper function to read token/user
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
  const [collapsed, setCollapsed] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      // If resized to mobile, collapse
      if (window.innerWidth < 768) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };

    // Add listener
    window.addEventListener("resize", handleResize);
    handleResize(); // Call on mount

    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const isLoginPage = location.pathname === "/login";
  const isHomePage = location.pathname === "/";

  return (
    <>
      {/* Show Layout only on protected dashboard pages */}
      {!isLoginPage && !isHomePage ? (
        <Layout role={getUser()?.role} collapsed={collapsed} setCollapsed={setCollapsed}>
          <div className="main-content">
            <Routes>
              <Route
                path="/admin/Dashboard"
                element={
                  <ProtectedRoute role="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/owner/Dashboard"
                element={
                  <ProtectedRoute role="owner">
                    <OwnerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/add-business"
                element={
                  <ProtectedRoute role="admin">
                    <AddBusinessPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/businesses"
                element={
                  <ProtectedRoute role="admin">
                    <BusinessesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/owner/settings"
                element={
                  <ProtectedRoute role="owner">
                    <OwnerSettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/owner/bookings"
                element={
                  <ProtectedRoute role="owner">
                    <BookingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/owner/calendar"
                element={
                  <ProtectedRoute role="owner">
                    <CalendarView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/owner/services"
                element={
                  <ProtectedRoute role="owner">
                    <ServicesPage />
                  </ProtectedRoute>
                }
              />
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

function App() {
  return (
    <>
      <LanguageProvider>
        <Router>
          <AppContent />
        </Router>
      </LanguageProvider>

      <ToastContainer
        position="top-right"
        autoClose={7000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
}

export default App;