import React from "react";
import "./TopStats.css";

const TopServices = ({ services , title = "Top Services"}) => {
  if (!services || services.length === 0) return null;

  return (
    <div className="top-card">
      <h4>{title}</h4>
      <ul>
        {services.map((item, index) => (
          <li key={index}>
            <span className="rank">#{index + 1}</span>
            <span className="label">{item.name}</span>
            <span className="count">{item.count}x</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TopServices;