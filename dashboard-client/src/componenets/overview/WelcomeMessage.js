import React from "react";
import "./WelcomeMessage.css";

const WelcomeMessage = ({ nameEnglish, username }) => {
  return (
    <div className="welcome-box">
      <h2>👋 Hello {nameEnglish} / {username}</h2>
    </div>
  );
};

export default WelcomeMessage;