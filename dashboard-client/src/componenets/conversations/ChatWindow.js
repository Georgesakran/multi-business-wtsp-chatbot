import React, { useEffect, useState, useRef } from "react";
import "./ChatWindow.css";
import api from "../../services/api";
import { toast } from "react-toastify";
import { getAvatarForId } from "./avatarUtils";
import { formatPhoneNumber } from "../../utils/phone";



const ChatWindow = ({ businessId, customerId, onBack ,language}) => {
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!customerId) return;

    const fetchMessages = async () => {
      try {
        const res = await api.get(`/conversations/${businessId}/${customerId}`);
        setMessages(res.data);
        scrollToBottom();
      } catch (err) {
        toast.error("❌ Failed to load messages");
      }
    };

    fetchMessages();
  }, [businessId, customerId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const formatDateLabel = (date) => {
    const today = new Date();
    const msgDate = new Date(date);
    const isToday = today.toDateString() === msgDate.toDateString();

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const isYesterday = yesterday.toDateString() === msgDate.toDateString();

    const daysDiff = Math.floor((today - msgDate) / (1000 * 60 * 60 * 24));

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";
    if (daysDiff < 7) {
      return msgDate.toLocaleDateString("en-US", { weekday: "long" });
    }

    return msgDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const groupByDate = (msgs) => {
    const grouped = {};
    msgs.forEach((msg) => {
      const dateKey = new Date(msg.timestamp).toDateString();
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(msg);
    });
    return grouped;
  };

  const groupedMessages = groupByDate(messages);

  return (
    <div className="chat-window">
      <div className="chat-header">
      <button className="back-btn" onClick={onBack}>
        {["ar", "he"].includes(language) ? "→" : "←"}
      </button>
        <div className="chat-header-avatar-wrapper">
          <img
            src={getAvatarForId(customerId)} // Use the shared function here
            alt="User avatar"
            className="chat-header-avatar"
          />
          <span className="chat-header-title">{formatPhoneNumber(customerId)}</span>
        </div>
      </div>

      <div className="chat-messages">
        {Object.keys(groupedMessages).map((dateKey) => (
          <div key={dateKey} className="message-group">
            <div className="date-label">{formatDateLabel(dateKey)}</div>
            {groupedMessages[dateKey].map((msg, idx) => {
              const isUser = msg.role === "user";
              const bubbleClass = isUser ? "right" : "left";
              const timestamp = new Date(msg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div key={idx} className={`chat-bubble ${bubbleClass}`}>
                  <div className="message-content">{msg.content}</div>
                  <div className="message-time">{timestamp}</div>
                </div>
              );
            })}
            <div ref={messagesEndRef}></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatWindow;
