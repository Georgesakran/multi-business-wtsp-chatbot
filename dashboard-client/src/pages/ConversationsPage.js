import React, { useState, useEffect,useContext } from "react";
import "../styles/ConversationsPage.css";
import ConversationList from "../componenets/conversations/ConversationList";
import ChatWindow from "../componenets/conversations/ChatWindow";
import api from "../services/api";
import { LanguageContext } from "../context/LanguageContext";


const ConversationsPage = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const businessId = user.businessId;
  const { language } = useContext(LanguageContext);
  

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [conversations, setConversations] = useState([]);
  const isMobile = window.innerWidth <= 768;
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await api.get(`/conversations/${businessId}`);
        setConversations(res.data);
        if (res.data.length > 0) {
          setSelectedCustomer(res.data[0]._id);
          if (!isMobile) setShowChatOnMobile(true); // Auto-show on desktop
        }
      } catch (err) {
        console.error("❌ Failed to load conversations", err);
      }
    };
  
    fetchConversations();
  }, [businessId, isMobile]);

  return (

    <div className={`conversations-page ${["ar", "he"].includes(language) ? "rtl" : "ltr"}`}>
      {/* Show Conversation List */}
      {(!isMobile || !showChatOnMobile) && (
        <div className="left-panel">
          <ConversationList
            conversations={conversations}
            selected={selectedCustomer}
            onSelect={(customerId) => {
              setSelectedCustomer(customerId);
              if (isMobile) setShowChatOnMobile(true);
            }}
          />
        </div>
      )}
  
      {/* Show Chat Window */}
      {(!isMobile || showChatOnMobile) && (
        <div className="right-panel">
          {selectedCustomer ? (
            <ChatWindow
              businessId={businessId}
              customerId={selectedCustomer}
              onBack={() => setShowChatOnMobile(false)} // 👈 new prop
              language={language}
            />
          ) : (
            <div className="empty-chat">
              <p>💬 Select a customer to view the conversation</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConversationsPage;