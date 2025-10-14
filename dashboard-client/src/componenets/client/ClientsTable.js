// src/components/client/ClientsTable.jsx
import React from "react";
import "./ClientsTable.css";

const ClientsTable = ({ clients, onSelectClient }) => {
  return (
    <div className="clients-table-wrapper">
      <table className="clients-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Book/Order</th>
            <th>Last Activity</th>
          </tr>
        </thead>
        <tbody>
          {clients.length === 0 ? (
            <tr>
              <td colSpan="5" className="no-data">
                No clients found
              </td>
            </tr>
          ) : (
            clients.map((c, i) => (
              <tr
                key={i}
                className="clickable-row"
                onClick={() => onSelectClient(c.phoneNumber)}
              >
                <td>{c.name}</td>
                <td>{c.phoneNumber}</td>
                <td>{c.visits}</td>
                <td>
                  {c.lastActivity
                    ? new Date(c.lastActivity).toLocaleDateString()
                    : "-"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ClientsTable;