import React, { useContext } from "react";
import "./ChatbotSection.css";
import api from "../../services/api";
import { toast } from "react-toastify";
import translations from "../../translate/translations";
import { getLabelByLang } from "../../translate/getLabelByLang";
import { LanguageContext } from "../../context/LanguageContext";

const ChatbotBookingStatusSelector = ({ config, setConfig }) => {
  const { language } = useContext(LanguageContext);
  const langKey = language === "english" ? "en" : language;

  // current value from config (default "pending")
  const currentStatus =
    config?.booking?.chatbotDefaultStatus || "pending";

  const handleChange = async (e) => {
    const newStatus = e.target.value;

    // 1️⃣ Update local state immediately
    setConfig((prev) => ({
      ...prev,
      booking: {
        ...(prev?.booking || {}),
        chatbotDefaultStatus: newStatus,
      },
    }));

    try {
      // 2️⃣ Persist to backend
      await api.put(`/businesses/${config._id}/update-chatbot`, {
        booking: {
          chatbotDefaultStatus: newStatus,
        },
      });

      toast.success(
        getLabelByLang(
          translations.chatbotmanegement.bookingStatusSaved,
          langKey
        )
      );
    } catch (err) {
      console.error("❌ Failed to update chatbot booking status", err);
      toast.error(
        getLabelByLang(
          translations.chatbotmanegement.bookingStatusError,
          langKey
        )
      );
    }
  };

  return (
    <div className="chatbot-section">
      <h3>
        📅{" "}
        {getLabelByLang(
          translations.chatbotmanegement.bookingStatusTitle,
          langKey
        )}
      </h3>
      <p>
        {getLabelByLang(
          translations.chatbotmanegement.bookingStatusDescription,
          langKey
        )}
      </p>

      <select value={currentStatus} onChange={handleChange}>
        <option value="pending">
          {getLabelByLang(
            translations.chatbotmanegement.bookingStatusPending,
            langKey
          )}
        </option>
        <option value="confirmed">
          {getLabelByLang(
            translations.chatbotmanegement.bookingStatusConfirmed,
            langKey
          )}
        </option>
      </select>
    </div>
  );
};

export default ChatbotBookingStatusSelector;