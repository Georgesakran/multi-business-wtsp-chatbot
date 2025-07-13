import React, { useState } from "react";
import "./TopStats.css";

const TopServices = ({ services , title = "Top Services"}) => {
  const [minimized, setMinimized] = useState(false);


  if (!services || services.length === 0) return null;

  return (
    <div className={`top-card ${minimized ? "collapsed" : ""}`}>
      <div className="top-card-header">
        <h4>{title}</h4>
        <div className="top-card-buttons">
          <button onClick={() => setMinimized(!minimized)}>
            {minimized ? "➕" : "➖"}
          </button>
        </div>
      </div>
      {!minimized && (
        <ul className="top-list">
          {services.map((item, index) => (
            <li key={index} className="top-list-item">
              <span className="rank">#{index + 1}</span>
              <span className="label">{item.name}</span>
              <span className="count">{item.count}x</span>
            </li>
          ))}
        </ul>
      )}  
    </div>
  );
};

export default TopServices;