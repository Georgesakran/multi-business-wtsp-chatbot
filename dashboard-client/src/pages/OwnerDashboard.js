import "../styles/Dashboard.css";
import "../styles/OwnerDashboard.css";
import "../styles/StatCard.css"; // Assuming you created this file
import { useEffect, useState } from "react";
import axios from "../services/api";
import StatCard from "../componenets/StatCard";

function OwnerDashboard() {
  const [business, setBusiness] = useState(null);

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        const businessId = user?.businessId;

        if (!businessId) return console.error("No business ID found in localStorage");

        const res = await axios.get(`/businesses/${businessId}`);
        setBusiness(res.data);
      } catch (err) {
        console.error("❌ Failed to fetch business data", err);
      }
    };

    fetchBusiness();
  }, []);

  if (!business) return <p>Loading dashboard...</p>;

  return (
    <div className="dashboard-layout">
      <div className="dashboard-card welcome-card">
        <h3>👋 Welcome {business.nameEnglish}</h3>
        <p>This is your dashboard home page. Manage your bot, services, and stats.</p>
      </div>

      <div className="dashboard-grid">
        <StatCard
          icon={<span className="material-icons">bar_chart</span>}
          iconBg="linear-gradient(195deg, #49a3f1, #1A73E8)"
          label="Today's Users"
          value="2,300"
          growth={3}
          subtext="than last month"
        />
        <StatCard
          icon={<span className="material-icons">storefront</span>}
          iconBg="linear-gradient(195deg, #66bb6a, #43a047)"
          label="Revenue"
          value="34k"
          growth={1}
          subtext="than yesterday"
        />
        <StatCard
          icon={<span className="material-icons">psychology</span>}
          iconBg="linear-gradient(195deg, #ffa726, #fb8c00)"
          label="GPT Tokens Used"
          value={business.gptTokensUsed || 0}
          growth={12}
          subtext="than last week"
        />
      </div>

      <div className="dashboard-card">
        <h4>📞 WhatsApp</h4>
        <p><strong>Connected Number:</strong> {business.whatsappNumber}</p>
        <p><strong>Status:</strong> <span className="status-badge">Active</span></p>
      </div>

      <div className="dashboard-card">
        <h4>🚀 Coming Soon</h4>
        <p>This area will show your most recent customer messages, bookings, and alerts.</p>
      </div>
    </div>
  );
}

export default OwnerDashboard;