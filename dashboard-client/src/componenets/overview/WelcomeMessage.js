import React, { useContext } from "react";
import { LanguageContext } from "../../context/LanguageContext";
import translations from "../../translate/translations"; // assuming you have this
import "./WelcomeMessage.css";

const WelcomeMessage = ({ business = {}}) => {
  const { language } = useContext(LanguageContext);

const displayName = business?.[language] || business?.en || "User";

  const welcomeText = translations.welcome?.[language] || "Welcome";
  return (
    <div className="welcome-message">
      <h2>
        👋 {welcomeText}, <span className="business-name">{displayName}</span>
      </h2>
    </div>
  );
};

export default WelcomeMessage;
