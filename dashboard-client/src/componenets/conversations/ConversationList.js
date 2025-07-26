import React, { useState } from "react";
import "./ConversationList.css";
import { getAvatarForId } from "./avatarUtils";
import { formatPhoneNumber } from "../../utils/phone";


const ConversationList = ({ conversations, selected, onSelect }) => {
  const [search, setSearch] = useState("");
  
  
  const filtered = conversations.filter((c) =>
    c._id.toLowerCase().includes(search.toLowerCase())
  );

  const handleClear = () => setSearch("");

  return (
    <div className="conversation-list">
      <div className="conversation-header">
        <h3 className="conversation-title">💬 Chats</h3>
        <div className="search-wrapper">
          <input
            type="text"
            placeholder="Search phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="clear-btn" onClick={handleClear}>
              ×
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="no-convo">No matching conversations</p>
      ) : (
        filtered.map((c) => {
          const last = c.lastMessage || "";
          const prefix = c.lastRole === "assistant" ? "bot: " : "";
          const shortMsg = (prefix + last).slice(0, 40);
          const timestamp = c.lastTimestamp
            ? new Date(c.lastTimestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";

          return (
            <div
              key={c._id}
              className={`conversation-item ${selected === c._id ? "selected" : ""}`}
              onClick={() => onSelect(c._id)}
            >
              <div className="avatar">
                <img
                  src={getAvatarForId(c._id)}
                  alt="avatar"
                  className="avatar-img"
                />
              </div>                
              <div className="convo-info">
                <div className="convo-header">                  
                  <strong>{formatPhoneNumber(c._id)}</strong>
                  <span className="timestamp">{timestamp}</span>
                </div>
                <p className="preview">{shortMsg || "No messages yet"}</p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default ConversationList;