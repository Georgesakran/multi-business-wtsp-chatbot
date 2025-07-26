import React from "react";
//import "./InventoryAlerts.css";

const InventoryAlerts = ({ alerts = [] }) => {
  if (alerts.length === 0) return null;

  return (
    <div className="inventory-alerts">
      <h3>📦 Inventory Alerts</h3>
      {alerts.map((item, i) => (
        <div key={i} className="alert-item">
          <strong>{item.name}</strong> — {item.reason}
        </div>
      ))}
    </div>
  );
};

export default InventoryAlerts;