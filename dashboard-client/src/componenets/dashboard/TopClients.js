import React from "react";
import "./TopStats.css";

const TopClients = ({ clients = [], title = "Top Clients" }) => {
  if (!clients.length) return null;

  return (
    <div className="top-card">
      <h4>{title}</h4>
      <ul>
        {clients.map((client, index) => (
          <li key={index}>
            <span className="rank">#{index + 1}</span>
            <span className="label">{client.phone}</span>
            <span className="count">{client.count}x</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TopClients;
