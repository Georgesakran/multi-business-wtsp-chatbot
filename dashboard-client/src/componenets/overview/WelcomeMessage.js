import React from "react";
import "./WelcomeMessage.css";

const WelcomeMessage = ({ businessName, username }) => {
  return (
    <div className="welcome-box">
      <h2>👋 Hello {businessName} / {username}</h2>
    </div>
  );
};

export default WelcomeMessage;