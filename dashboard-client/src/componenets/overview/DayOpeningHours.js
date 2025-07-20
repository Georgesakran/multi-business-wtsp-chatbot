import React, { useState } from "react";
import "./DayOpeningHours.css";

const BookingDetails = ({ booking }) => (
  <div className="booking-details-card">
    <div className="booking-detail">
      <strong>Name:</strong> {booking.customerName}
    </div>
    <div className="booking-detail">
      <strong>Phone:</strong> {booking.phoneNumber}
    </div>
    <div className="booking-detail">
      <strong>Time:</strong> {booking.time}
    </div>
    <div className="booking-detail">
      <strong>Service:</strong> {booking.service?.en || "N/A"}
    </div>
  </div>
);

const StatusSection = ({ title, icon, count, bookings }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="status-section">
      <div className="status-header" onClick={() => setOpen(!open)}>
        <div className="status-left">
          <img src={icon} alt={title} className="status-icon" />
          <span>{title}</span>
        </div>
        <div className="status-count">{count}</div>
      </div>

      {open && (
        <div className="status-bookings-wrapper">
          {bookings.map((b, i) => (
            <BookingDetails key={i} booking={b} />
          ))}
        </div>
      )}
    </div>
  );
};



const DayOpeningHours = ({ isOff, open, close, bookingsCount, bookings = [] }) => {
  const pending = bookings.filter(b => b.status === "pending");
  const confirmed = bookings.filter(b => b.status === "confirmed");
  const cancelled = bookings.filter(b => b.status === "cancelled");

  return (
    <div className="overview-selectedDate">
      <div className="overview-day-box">
        <h3 className="content-day-hours-box">
          🕒 {isOff ? "Closed Today" : `Open: ${open} - ${close}`}
        </h3>
      </div>

      <div className="overview-day-box">
        {bookings.length > 0 && (<div title="Total Bookings">📅 Total Bookings: {bookings.length}</div>
        )}
        {bookings.length <= 0 && (<div title="Total Bookings">There are no Bookings Today - {bookings.length}</div>
        )}

        {pending.length > 0 && (
          <StatusSection title="Pending" icon="/images/pending.png" count={pending.length} bookings={pending} />
        )}
        {confirmed.length > 0 && (
          <StatusSection title="Confirmed" icon="/images/confirmed.png" count={confirmed.length} bookings={confirmed} />
        )}
        {cancelled.length > 0 && (
          <StatusSection title="Cancelled" icon="/images/cancelled.png" count={cancelled.length} bookings={cancelled} />
        )}

      </div>
    </div>
  );
};

export default DayOpeningHours;
