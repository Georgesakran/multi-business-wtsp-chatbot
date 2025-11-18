import React, { useContext } from "react";
import "./ChatbotSection.css";
import ToggleSwitch from "../ToggleSwitch";
import { toast } from "react-toastify";
import api from "../../services/api";
import { LanguageContext } from "../../context/LanguageContext";
import { getLabelByLang } from "../../translate/getLabelByLang";
import translations from "../../translate/translations";

const ChatbotToggleSection = ({ config, setConfig }) => {
  const { language } = useContext(LanguageContext);
  const langKey = language === "english" ? "en" : language;

  const handleToggle = async () => {
    try {
      const updated = { ...config, chatbotEnabled: !config.chatbotEnabled };
      setConfig(updated);

      await api.put(`/businesses/${config._id}/update-chatbot`, {
        chatbotEnabled: updated.chatbotEnabled,
      });

      toast.success(getLabelByLang(translations.chatbotmanegement.chatbotToggleSuccess, langKey));
    } catch (error) {
      console.error("Error updating chatbot status:", error);
      toast.error(getLabelByLang(translations.chatbotmanegement.chatbotToggleError, langKey));
    }
  };

  

  return (
    <div className="chatbot-section">
      <h3>🟢 {getLabelByLang(translations.chatbotmanegement.chatbotToggleTitle, langKey)}</h3>
      <p>{getLabelByLang(translations.chatbotmanegement.chatbotToggleDescription, langKey)}</p>
      <ToggleSwitch checked={config.chatbotEnabled} onChange={handleToggle} />
    </div>
    
  );
};

export default ChatbotToggleSection;