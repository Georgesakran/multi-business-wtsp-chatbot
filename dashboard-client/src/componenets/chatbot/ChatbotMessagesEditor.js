import React, { useState } from "react";
import "./ChatbotSection.css";
import api from "../../services/api";
import { toast } from "react-toastify";

const ChatbotMessagesEditor = ({ config, setConfig }) => {
  const [welcomeMessage, setWelcomeMessage] = useState(config.welcomeMessage || "");
  const [fallbackMessage, setFallbackMessage] = useState(config.fallbackMessage || "");

  const handleSave = async () => {
    const updated = {
      ...config,
      welcomeMessage,
      fallbackMessage,
    };
    setConfig(updated);

    try {
      await api.put(`/businesses/${config._id}/update-chatbot`, {
        welcomeMessage,
        fallbackMessage,
      });
      toast.success("Messages updated successfully ✅");
    } catch (err) {
      console.error("❌ Failed to update messages", err);
      toast.error("Failed to update chatbot messages ❌");
    }
  };

  return (
    <div className="chatbot-section">
      <h3>💬 Chatbot Messages</h3>

      <label>Welcome Message:</label>
      <textarea
        rows="3"
        value={welcomeMessage}
        onChange={(e) => setWelcomeMessage(e.target.value)}
        placeholder="Hello! How can I help you today?"
      />

      <label>Fallback Message:</label>
      <textarea
        rows="3"
        value={fallbackMessage}
        onChange={(e) => setFallbackMessage(e.target.value)}
        placeholder="Sorry, I didn’t understand. Please rephrase or choose a service."
      />

      <button onClick={handleSave}>💾 Save Messages</button>
    </div>
  );
};

export default ChatbotMessagesEditor;

