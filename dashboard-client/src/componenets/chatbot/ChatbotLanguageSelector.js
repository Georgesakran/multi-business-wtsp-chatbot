import React, { useContext } from "react";
import "./ChatbotSection.css";
import api from "../../services/api";
import { toast } from "react-toastify";
import translations from "../../translate/translations";
import { getLabelByLang } from "../../translate/getLabelByLang";
import { LanguageContext } from "../../context/LanguageContext";

const ChatbotLanguageSelector = ({ config, setConfig }) => {
  const { language } = useContext(LanguageContext);
  const langKey = language === "english" ? "en" : language;

  const handleChange = async (e) => {
    const newLanguage = e.target.value;
    const updatedConfig = { ...config, language: newLanguage };
    setConfig(updatedConfig);

    try {
      await api.put(`/businesses/${config._id}/update-chatbot`, {
        language: newLanguage,
      });
      toast.success("✅ Chatbot language updated");
    } catch (err) {
      console.error("❌ Failed to update chatbot language", err);
      toast.error("❌ Failed to update chatbot language");
    }
  };

  return (
    <div className="chatbot-section">
      <h3>🌐 {getLabelByLang(translations.chatbotmanegement.chatbotLanguageTitle, langKey)}</h3>
      <p>{getLabelByLang(translations.chatbotmanegement.chatbotLanguageDescription, langKey)}</p>
      <select value={config.language || "english"} onChange={handleChange}>
        <option value="english">{getLabelByLang(translations.chatbotmanegement.languageEnglish, langKey)}</option>
        <option value="arabic">{getLabelByLang(translations.chatbotmanegement.languageArabic, langKey)}</option>
        <option value="hebrew">{getLabelByLang(translations.chatbotmanegement.languageHebrew, langKey)}</option>
      </select>
    </div>
  );
};

export default ChatbotLanguageSelector;