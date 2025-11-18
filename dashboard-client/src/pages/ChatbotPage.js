import React, { useEffect, useState, useContext } from "react";
import api from "../services/api";

import { LanguageContext } from "../context/LanguageContext";
import ChatbotToggleSection from "../componenets/chatbot/ChatbotToggleSection";
import ChatbotLanguageSelector from "../componenets/chatbot/ChatbotLanguageSelector";
import ChatbotMessagesEditor from "../componenets/chatbot/ChatbotMessagesEditor";
import ChatbotMenuEditor from "../componenets/chatbot/ChatbotMenuEditor";
import SystemPromptEditor from "../componenets/chatbot/SystemPromptEditor";
import FeatureToggles from "../componenets/chatbot/FeatureToggles";
import UsageStats from "../componenets/chatbot/UsageStats";
import "../styles/ChatbotPage.css";

const ChatbotPage = () => {
  const { language } = useContext(LanguageContext);
  const [config, setConfig] = useState(null);
  const [stats, setStats] = useState(null);
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1️⃣ Load config
        const configRes = await api.get(
          `/businesses/${user.businessId}/chatbot-config`
        );
        setConfig({
          _id: configRes.data._id,
          ...configRes.data.config,
        });

        // 2️⃣ Load stats separately
        const statsRes = await api.get(
          `/businesses/${user.businessId}/chatbot-usage`
        );
        setStats(statsRes.data);
      } catch (err) {
        console.error("❌ Failed to load chatbot config or stats", err);
      }
    };

    fetchData();
  }, [user.businessId]);

  // ✅ NEW: change handler for chatbot booking status
  const handleBookingStatusChange = async (e) => {
    const value = e.target.value; // "pending" | "confirmed"

    // build next config in memory
    const nextConfig = (prev => {
      const prevBooking = prev?.booking || {};
      return {
        ...prev,
        booking: {
          ...prevBooking,
          chatbotDefaultStatus: value,
        },
      };
    })(config);

    // update local state immediately
    setConfig(nextConfig);

    try {
      // don’t send _id inside config body
      const { _id, ...configBody } = nextConfig;

      // 🔧 if your PUT route name is different, just change this URL
      await api.put(
        `/businesses/${user.businessId}/chatbot-config`,
        { config: configBody }
      );
    } catch (err) {
      console.error("❌ Failed to update chatbot booking status", err);
      // optional: rollback / show toast
    }
  };

  if (!config || !stats) return <div>Loading...</div>;

  // current selected value
  const chatbotBookingStatus =
    config?.booking?.chatbotDefaultStatus || "pending";

  return (
    <div
      className={`chatbot-page ${
        ["ar", "he"].includes(language) ? "rtl" : "ltr"
      }`}
    >
      <div className="first-section-chatbot-page">
        <ChatbotToggleSection config={config} setConfig={setConfig} />
        <ChatbotLanguageSelector config={config} setConfig={setConfig} />
      </div>

      <ChatbotMessagesEditor config={config} setConfig={setConfig} />
      <ChatbotMenuEditor config={config} setConfig={setConfig} />
      <SystemPromptEditor config={config} setConfig={setConfig} />
      <FeatureToggles config={config} setConfig={setConfig} />

      {/* ✅ NEW BLOCK: chatbot booking status */}
      <div className="chatbot-card">
        <h3>Chatbot booking status</h3>
        <p className="chatbot-setting-description">
          Choose how new bookings created via WhatsApp chatbot should be saved
          in the system.
        </p>

        <select
          value={chatbotBookingStatus}
          onChange={handleBookingStatusChange}
        >
          <option value="pending">
            Pending — owner will confirm manually
          </option>
          <option value="confirmed">
            Confirmed — auto-approved immediately
          </option>
        </select>
      </div>

      <UsageStats stats={stats} />
    </div>
  );
};

export default ChatbotPage;