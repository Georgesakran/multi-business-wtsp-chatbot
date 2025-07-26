import React, { useState } from "react";
import "./ChatbotSection.css";
import api from "../../services/api";
import { toast } from "react-toastify";

const SystemPromptEditor = ({ config, setConfig }) => {
  const [prompt, setPrompt] = useState(config.systemPrompt || "");

  const handleSave = async () => {
    const updated = { ...config, systemPrompt: prompt };
    setConfig(updated);

    try {
      await api.put(`/businesses/${config._id}/update-chatbot`, {
        systemPrompt: prompt,
      });
      toast.success("System prompt updated ✅");
    } catch (error) {
      console.error("❌ Failed to update system prompt", error);
      toast.error("Failed to update system prompt ❌");
    }
  };

  return (
    <div className="chatbot-section">
      <h3>🧠 System Prompt</h3>
      <p>This defines how the chatbot behaves. You can change the tone, behavior, or instructions.</p>

      <textarea
        rows="6"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="You are a helpful assistant for a beauty salon. Always greet customers politely..."
      />

      <button onClick={handleSave}>💾 Save Prompt</button>
    </div>
  );
};

export default SystemPromptEditor;
