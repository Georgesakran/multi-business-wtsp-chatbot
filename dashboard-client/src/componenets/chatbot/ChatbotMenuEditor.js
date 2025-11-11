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
  label: {
    ar: "",
    en: "",
    he: "",
  },
});

const ChatbotMenuEditor = ({ config, setConfig }) => {
  const [menuItems, setMenuItems] = useState(config.menuItems || []);
  const [activeLang, setActiveLang] = useState("en");

  const handleAdd = () => {
    const maxId = menuItems.reduce(
      (max, item) => (item.id > max ? item.id : max),
      0
    );
    const nextId = maxId + 1 || 1;
    const newItem = emptyItem(nextId);
    setMenuItems((prev) => [...prev, newItem]);
  };

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

  const activeLangLabel =
    LANGS.find((l) => l.code === activeLang)?.label || "English";

  return (
    <div className="chatbot-section">
      <div className="chatbot-section-header">
        <h3>📋 WhatsApp Main Menu Items</h3>
        <span className="chatbot-section-subtitle">
          Configure what appears when the customer types <code>menu</code>.
        </span>
      </div>

      {/* Language tabs for labels */}
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



      <div className="chatbot-menu-items">
        {menuItems.length === 0 && (
          <div className="chatbot-empty-state">
            No menu items yet. Click <b>“Add menu item”</b> to start.
          </div>
        )}

        {menuItems.map((item) => (
          <div key={item.id} className="chatbot-menu-item-row">
            {/* HEADER ROW */}
            <div className="chatbot-menu-item-header">
              <div className="chatbot-menu-item-header-left">
                <span className="menu-item-number">#{item.id}</span>
                <select
                  className="chatbot-select"
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
              </div>

              <div className="chatbot-menu-item-header-right">
                <span className="menu-item-toggle-label">Enabled</span>
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
                <button
                  type="button"
                  className="psel-btn danger menu-item-remove-btn"
                  onClick={() => handleRemove(item.id)}
                >
                  ✖ Remove
                </button>
              </div>
            </div>

            {/* BODY ROW */}
            <div className="chatbot-menu-item-body">
              <div className="chatbot-field">
                <label className="chatbot-field-label">
                  Label in {activeLangLabel}
                </label>
                <input
                  type="text"
                  className="chatbot-input"
                  value={(item.label && item.label[activeLang]) || ""}
                  onChange={(e) =>
                    updateLabel(item.id, activeLang, e.target.value)
                  }
                  placeholder="What the customer sees in the menu"
                />
              </div>

            </div>
          </div>
        ))}
      </div>

      <div className="chatbot-menu-actions">
        <button
          type="button"
          className="psel-btn secondary"
          onClick={handleAdd}
        >
          ➕ Add menu item
        </button>
        <button
          type="button"
          className="psel-btn primary"
          onClick={handleSave}
        >
          💾 Save Menu Items
        </button>
      </div>
    </div>
  );
};

export default ChatbotMenuEditor;