// src/componenets/chatbot/ChatbotMenuEditor.jsx
import React, { useState } from "react";
import "./ChatbotSection.css";
import api from "../../services/api";
import { toast } from "react-toastify";

const LANGS = [
  { code: "ar", label: "العربية" },
  { code: "en", label: "English" },
  { code: "he", label: "עברית" },
];

const ACTIONS = [
  { value: "book_appointment", label: "Book appointment" },
  { value: "view_services", label: "View services" },
  { value: "view_products", label: "View products" },
  { value: "view_courses", label: "View courses" },
  { value: "about_location", label: "About / Location" },
  { value: "my_appointments", label: "My appointments" },
  { value: "my_orders", label: "My orders" },
  { value: "reschedule_appointment", label: "Reschedule / cancel" },
  { value: "contact_us", label: "Contact us" },
  { value: "follow_instagram", label: "Follow on Instagram" },
  { value: "custom", label: "Custom (handle in code later)" },
];

const emptyItem = (nextId) => ({
  id: nextId,
  enabled: true,
  action: "book_appointment",
  payload: "",
  label: {
    ar: "",
    en: "",
    he: "",
  },
});

const ChatbotMenuEditor = ({ config, setConfig }) => {
  // config.menuItems comes from backend in ChatbotPage
  const [menuItems, setMenuItems] = useState(config.menuItems || []);
  const [activeLang, setActiveLang] = useState("en");

  // Add new item
  const handleAdd = () => {
    const maxId = menuItems.reduce(
      (max, item) => (item.id > max ? item.id : max),
      0
    );
    const nextId = maxId + 1 || 1;
    const newItem = emptyItem(nextId);
    setMenuItems((prev) => [...prev, newItem]);
  };

  // Remove item
  const handleRemove = (id) => {
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id, patch) => {
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
            }
          : item
      )
    );
  };

  const updateLabel = (id, lang, value) => {
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              label: {
                ...(item.label || {}),
                [lang]: value,
              },
            }
          : item
      )
    );
  };

  const handleSave = async () => {
    try {
      // Local update
      setConfig((prev) => ({
        ...prev,
        menuItems,
      }));

      await api.put(`/businesses/${config._id}/update-chatbot`, {
        menuItems,
      });

      toast.success("Menu items saved ✅");
    } catch (err) {
      console.error("❌ Failed to save menu items", err);
      toast.error("Failed to save menu items ❌");
    }
  };

  return (
    <div className="chatbot-section">
      <h3>📋 WhatsApp Main Menu Items</h3>

      {/* Lang tabs for labels */}
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

      <p className="chatbot-hint">
        Items are mapped by <b>number</b>. Example: item with ID=1 is option
        "1️⃣", ID=2 is "2️⃣", etc.  
        Bot logic reads <code>action</code> + <code>payload</code> to decide
        what to do.
      </p>

      <div className="chatbot-menu-items">
        {menuItems.length === 0 && (
          <div className="chatbot-hint">
            No menu items yet. Click "Add menu item" to start.
          </div>
        )}

        {menuItems.map((item) => (
          <div key={item.id} className="chatbot-menu-item-row">
            <div className="chatbot-menu-item-header">
              <span className="badge">#{item.id}</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={item.enabled !== false}
                  onChange={(e) =>
                    updateItem(item.id, { enabled: e.target.checked })
                  }
                />
                <span className="slider" />
              </label>
              <select
                value={item.action || "custom"}
                onChange={(e) =>
                  updateItem(item.id, { action: e.target.value })
                }
              >
                {ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="psel-btn danger"
                onClick={() => handleRemove(item.id)}
              >
                ✖ Remove
              </button>
            </div>

            <div className="chatbot-menu-item-body">
              <input
                type="text"
                className="chatbot-input"
                value={(item.label && item.label[activeLang]) || ""}
                onChange={(e) =>
                  updateLabel(item.id, activeLang, e.target.value)
                }
                placeholder={`Label in ${
                  activeLang === "ar"
                    ? "Arabic"
                    : activeLang === "he"
                    ? "Hebrew"
                    : "English"
                } (what user sees in menu text)`}
              />

              <input
                type="text"
                className="chatbot-input"
                value={item.payload || ""}
                onChange={(e) =>
                  updateItem(item.id, { payload: e.target.value })
                }
                placeholder="Optional payload (e.g. URL, tag, category name...)"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="chatbot-menu-actions">
        <button type="button" onClick={handleAdd}>
          ➕ Add menu item
        </button>
        <button type="button" onClick={handleSave}>
          💾 Save Menu Items
        </button>
      </div>
    </div>
  );
};

export default ChatbotMenuEditor;