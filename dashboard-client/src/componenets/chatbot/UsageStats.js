import React from "react";
import "./ChatbotSection.css";
import { useContext } from "react";
import { LanguageContext } from "../../context/LanguageContext";
import translations from "../../translate/translations";
import { getLabelByLang } from "../../translate/getLabelByLang";

const UsageStats = ({ stats = {} }) => {
  const { language } = useContext(LanguageContext);
  const langKey = language === "english" ? "en" : language;

  return (
    <div className="chatbot-section">
      <h3>📈 {getLabelByLang(translations.chatbotmanegement.chatbotUsageTitle, langKey)}</h3>
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-title">
            📨 {getLabelByLang(translations.chatbotmanegement.totalMessagesReceived, langKey)}
          </div>
          <div className="stat-value">{stats.totalMessages || 0}</div>
        </div>

        <div className="stat-box">
          <div className="stat-title">
            🤖 {getLabelByLang(translations.chatbotmanegement.botFailedToUnderstand, langKey)}
          </div>
          <div className="stat-value">{stats.botReplies || 0}</div>
        </div>

        <div className="stat-box">
          <div className="stat-title">
            📅 {getLabelByLang(translations.chatbotmanegement.bookingsViaBot, langKey)}
          </div>
          <div className="stat-value">{stats.chatbotBookings || 0}</div>
        </div>

        <div className="stat-box">
          <div className="stat-title">
            🕒 {getLabelByLang(translations.chatbotmanegement.lastActive, langKey)}
          </div>
          <div className="stat-value">
            {stats.lastActive
              ? new Date(stats.lastActive).toLocaleString()
              : getLabelByLang(translations.chatbotmanegement.notAvailable, langKey)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageStats;