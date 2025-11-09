// src/components/chatbot/ChatbotMessagesEditor.jsx
import React, { useState } from "react";
import "./ChatbotSection.css";
import api from "../../services/api";
import { toast } from "react-toastify";

const LANGS = [
  { code: "ar", label: "العربية" },
  { code: "en", label: "English" },
  { code: "he", label: "עברית" },
];

const emptyMessagesForLang = {
  welcome_first: "",
  welcome_returning: "",
  fallback: "",
  main_menu: "",
};

const ChatbotMessagesEditor = ({ config, setConfig }) => {
  // config here is whatever you set in ChatbotPage:
  // { _id, chatbotEnabled, language, messages, ... }

  const [activeLang, setActiveLang] = useState("en");

  const [messages, setMessages] = useState(
    config.messages || {
      ar: { ...emptyMessagesForLang },
      en: { ...emptyMessagesForLang },
      he: { ...emptyMessagesForLang },
    }
  );

  const handleChange = (lang, field, value) => {
    setMessages((prev) => ({
      ...prev,
      [lang]: {
        ...(prev[lang] || emptyMessagesForLang),
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    try {
      const payload = { messages };

      // Local state update for immediate UI feedback
      setConfig((prev) => ({
        ...prev,
        messages: payload.messages,
      }));

      await api.put(`/businesses/${config._id}/update-chatbot`, payload);

      toast.success("Chatbot messages saved ✅");
    } catch (err) {
      console.error("❌ Failed to update chatbot messages", err);
      toast.error("Failed to update chatbot messages ❌");
    }
  };

  const current = messages[activeLang] || emptyMessagesForLang;

  return (
    <div className="chatbot-section">
      <h3>💬 WhatsApp Chatbot Messages</h3>

      {/* Language tabs */}
      <div className="chatbot-lang-tabs">
        {LANGS.map((l) => (
          <button
            key={l.code}
            className={
              "chatbot-lang-tab" +
              (activeLang === l.code ? " chatbot-lang-tab--active" : "")
            }
            onClick={() => setActiveLang(l.code)}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="chatbot-messages-group">
        <label>
          Welcome message (first time):
          <textarea
            rows="3"
            value={current.welcome_first}
            onChange={(e) =>
              handleChange(activeLang, "welcome_first", e.target.value)
            }
            placeholder="Example: Welcome to {{business_name}} ..."
          />
        </label>

        <label>
          Welcome message (returning):
          <textarea
            rows="3"
            value={current.welcome_returning}
            onChange={(e) =>
              handleChange(activeLang, "welcome_returning", e.target.value)
            }
            placeholder="Example: Welcome back to {{business_name}} ..."
          />
        </label>

        <label>
          Fallback message:
          <textarea
            rows="3"
            value={current.fallback}
            onChange={(e) =>
              handleChange(activeLang, "fallback", e.target.value)
            }
            placeholder="Example: Sorry, I didn’t understand. Type *menu* to see options."
          />
        </label>

        <label>
          Main menu message:
          <textarea
            rows="4"
            value={current.main_menu}
            onChange={(e) =>
              handleChange(activeLang, "main_menu", e.target.value)
            }
            placeholder={
              "Example:\n🌸 Main Menu — {{business_name}}\n1) Book an appointment\n2) FAQs\n3) Contact\n..."
            }
          />
          <small className="chatbot-hint">
            You can use <code>{"{{business_name}}"}</code> in the text.  
            This is the full menu text; later we can make it dynamic.
          </small>
        </label>
      </div>

      <button onClick={handleSave}>💾 Save Messages</button>
    </div>
  );
};

export default ChatbotMessagesEditor;