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
};

const ChatbotMessagesEditor = ({ config, setConfig }) => {
  const [activeLang, setActiveLang] = useState("en");
  const [messages, setMessages] = useState(
    config.messages || {
      ar: { ...emptyMessagesForLang },
      en: { ...emptyMessagesForLang },
      he: { ...emptyMessagesForLang },
    }
  );

const [collapsed, setCollapsed] = useState(true); // NEW
const [isClosing, setIsClosing] = useState(false);

const toggleSection = () => {
  if (!collapsed) {
    // it's open → start closing animation
    setIsClosing(true);
    setTimeout(() => {
      setCollapsed(true);
      setIsClosing(false);
    }, 350); // must match fade-out duration
  } else {
    // it's closed → open normally
    setCollapsed(false);
  }
};


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
      {/* Collapsible header button */}
      <button
        className="chatbot-section-toggle"
        onClick={toggleSection}
      >
        💬 WhatsApp Chatbot Messages {collapsed ? "▼" : "▲"}
      </button>

      {/* Collapsible content */}
      {(!collapsed || isClosing) && (
        <div
          className={
            "chatbot-section-content" + (isClosing ? " fade-out" : "")
          }
        >
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
          </div>

          <button
            type="button"
            className="psel-btn primary"
            onClick={handleSave}
          >
            💾 Save Menu Items
          </button>        
        </div>
      )}
    </div>
  );
};

export default ChatbotMessagesEditor;
