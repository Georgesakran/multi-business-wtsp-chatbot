import React from "react";
import "./DayOpeningHours.css";

const DayOpeningHours = ({ isOff, open, close, bookingsCount, statusCounts }) => {
  return (
    <div className="day-hours-box">
      <h3>🕒 {isOff ? "Closed Today" : `Open: ${open} - ${close}`}</h3>
      <div className="status-row">📅 Total Bookings: {bookingsCount}</div>
      <div className="status-row">🟡 Pending: {statusCounts?.pending || 0}</div>
      <div className="status-row">🟢 Confirmed: {statusCounts?.confirmed || 0}</div>
      <div className="status-row">🔴 Cancelled: {statusCounts?.cancelled || 0}</div>
    </div>
  );
};

export default DayOpeningHours;