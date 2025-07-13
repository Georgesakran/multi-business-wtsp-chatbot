import React, { useState } from "react";
import "./TopStats.css";

const TopClients = ({ clients = [], title = "Top Clients" }) => {
  const [minimized, setMinimized] = useState(false);

  if (!clients.length) return null;

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
          {clients.map((client, index) => (
            <li key={index} className="top-list-item">
              <span className="rank">#{index + 1}</span>
              <span className="label">{client.phone}</span>
              <span className="count">{client.count}x</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TopClients;