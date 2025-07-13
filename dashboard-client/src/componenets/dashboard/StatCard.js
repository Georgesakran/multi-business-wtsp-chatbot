import React from "react";
import "./StatCard.css";

const StatCard = ({ label, value, color, icon }) => {
  return (
    <div className="stat-card" style={{ borderLeft: `5px solid ${color}` }}>
      {/* <div className="stat-icon">{icon}</div> */}
      <div className="stat-info">
        <p className="stat-value">{value}</p>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
};

export default StatCard;