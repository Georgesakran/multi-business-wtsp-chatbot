import React, { useEffect, useState,useContext } from "react";
import axios from "../services/api";
import { LanguageContext } from "../context/LanguageContext";
import ChatbotToggleSection from "../componenets/chatbot/ChatbotToggleSection";
import ChatbotLanguageSelector from "../componenets/chatbot/ChatbotLanguageSelector";
import ChatbotMessagesEditor from "../componenets/chatbot/ChatbotMessagesEditor";
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
        const configRes = await axios.get(`/businesses/${user.businessId}/chatbot-config`);
        setConfig({
          _id: configRes.data._id,
          ...configRes.data.config,
        });

        // 2️⃣ Load stats separately
        const statsRes = await axios.get(`/businesses/${user.businessId}/chatbot-usage`);
        setStats(statsRes.data);
      } catch (err) {
        console.error("❌ Failed to load chatbot config or stats", err);
      }
    };

    fetchData();
  }, [user.businessId]);

  if (!config || !stats) return <div>Loading...</div>;

  return (
    <div className={`chatbot-page ${["ar", "he"].includes(language) ? "rtl" : "ltr"}`}>
      <h2>🤖 Chatbot Management</h2>
      <div className="first-section-chatbot-page">
        <ChatbotToggleSection config={config} setConfig={setConfig} />
        <ChatbotLanguageSelector config={config} setConfig={setConfig} />
      </div>
      
      <ChatbotMessagesEditor config={config} setConfig={setConfig} />
      <SystemPromptEditor config={config} setConfig={setConfig} />
      <FeatureToggles config={config} setConfig={setConfig} />
      <UsageStats stats={stats} />
    </div>
  );
};

export default ChatbotPage;
