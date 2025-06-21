import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/HomePage.css'; // Import your CSS styles

const HomePage = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (user?.role === "admin") navigate("/admin/Dashboard");
    if (user?.role === "owner") navigate("/owner/Dashboard");
  }, [navigate, user]);

  return (
    <div className="home-container dark-theme">
      <div className="background-blobs"></div>

      <header className="hero-section">
        <h1 className="gradient-text">Sakran Agency AI</h1>
        <p>Smart WhatsApp Automation for Modern Businesses</p>
        <button className="login-button" onClick={() => navigate("/login")}>
          Enter Dashboard
        </button>
      </header>

      <section className="glass-about">
        <h2>🛠 WHAT WE DO</h2>
        <p>
          We build intelligent WhatsApp chatbots, automate customer replies, manage bookings,
          and help small businesses thrive — all from a single smart dashboard.
        </p>
      </section>

      <section className="features-section">
        <h2>✨ PLATFORM FEATURES</h2>
        <div className="features-grid">
          <div className="feature-card">🤖 Smart Chatbot Replies</div>
          <div className="feature-card">📅 Booking Management</div>
          <div className="feature-card">🌐 Multi-language Support</div>
        </div>
        <div className="features-grid">
            <div className="feature-card">📊 Owner Dashboard</div>
            <div className="feature-card">📩 WhatsApp Inbox Automation</div>
            <div className="feature-card">🧠 GPT-Powered Answers</div>
        </div>
      </section>

      <section className="industries-section">
        <h2>🪄 WE HELP BUSINESSES LIKE</h2>
        <div className="feature-card">💇 Hair & Beauty Salons</div>
        <div className="feature-card">📸 Photography Studios</div>
        <div className="feature-card">👠 Home Shops & Delivery</div>
        <div className="feature-card">🏥 Clinics & Small Services</div>
        <div className="feature-card">📱 Freelancers & Side Hustles</div>
      </section>

      <section className="trust-section">
        <h2>💡 WHY CHOOSE SAKRAN AGENCY?</h2>
        <p>
          We believe in simplicity, speed, and full automation. Our AI-based chatbot system works 24/7, speaks your
          customer’s language, and gives business owners full control from one place. No tech skills needed.
        </p>
      </section>

      <footer className="footer-contact">
        <h3>📬 CONTACT US</h3>
        <p>Email: <a href="mailto:support@sakranagency-ai.com">support@sakranagency-ai.com</a></p>
        <p>WhatsApp: <a href="https://wa.me/972587400656" target="_blank" rel="noreferrer">+972-58-740-0656</a></p>
      </footer>
    </div>
  );
};

export default HomePage;