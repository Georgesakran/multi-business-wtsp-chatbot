import React, { useContext } from "react";
import "./ChatbotSection.css";
import api from "../../services/api";
import { LanguageContext } from "../../context/LanguageContext";
import translations from "../../translate/translations";
import { getLabelByLang } from "../../translate/getLabelByLang";

const FeatureToggles = ({ config, setConfig }) => {
  const { language } = useContext(LanguageContext);
  const langKey = language === "english" ? "en" : language;

  const handleToggle = async (field) => {
    const updated = {
      ...config,
      features: {
        ...config.features,
        [field]: !config.features?.[field],
      },
    };
    setConfig(updated);

    try {
      await api.put(`/businesses/${config._id}/update-chatbot`, {
        features: updated.features,
      });
    } catch (error) {
      console.error("❌ Failed to update feature toggles", error);
    }
  };

  return (
    <div className="chatbot-section">
      <h3>🧩 {getLabelByLang(translations.chatbotmanegement.featureControlsTitle, langKey)}</h3>
      <p>{getLabelByLang(translations.chatbotmanegement.featureControlsDescription, langKey)}</p>

      <label>
        <input
          type="checkbox"
          checked={config.features?.autoBooking || false}
          onChange={() => handleToggle("autoBooking")}
        />
        ✅ {getLabelByLang(translations.chatbotmanegement.autoBooking, langKey)}
      </label>

      <label>
        <input
          type="checkbox"
          checked={config.features?.productReplies || false}
          onChange={() => handleToggle("productReplies")}
        />
        📦 {getLabelByLang(translations.chatbotmanegement.productReplies, langKey)}
      </label>

      <label>
        <input
          type="checkbox"
          checked={config.features?.faqSupport || false}
          onChange={() => handleToggle("faqSupport")}
        />
        ❓ {getLabelByLang(translations.chatbotmanegement.faqSupport, langKey)}
      </label>
    </div>
  );
};

export default FeatureToggles;