import React, { useState, useContext } from "react";
import "./DayOpeningHours.css";
import { LanguageContext } from "../../context/LanguageContext";
import translations from "../../translate/translations";
import { getLabelByLang } from "../../translate/getLabelByLang";

const BookingDetails = ({ booking }) => {
  const { language } = useContext(LanguageContext);

  return (
    <div className="booking-details-card">
      <div className="booking-detail">
        <strong>{getLabelByLang(translations.overview.bookingDetails.name, language)}:</strong> {booking.customerName}
      </div>
      <div className="booking-detail">
        <strong>{getLabelByLang(translations.overview.bookingDetails.phone, language)}:</strong> {booking.phoneNumber}
      </div>
      <div className="booking-detail">
        <strong>{getLabelByLang(translations.overview.bookingDetails.time, language)}:</strong> {booking.time}
      </div>
      <div className="booking-detail">
        <strong>{getLabelByLang(translations.overview.bookingDetails.service, language)}:</strong> {booking.service?.[language] || "N/A"}
      </div>
    </div>
  );
};

const StatusSection = ({ title, icon, count, bookings }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="status-section">
      <div className="status-header" onClick={() => setOpen(!open)}>
        <div className="status-left">
          <img src={icon} alt={title} className="status-icon" />
          <span>{title}</span>
        </div>
        <div className="status-count">
          <span>{count}</span>
          <img
            src="/images/dropdown.png"
            alt="dropdown"
            className={`dropdown-icon ${open ? "open" : ""}`}
          />
        </div>

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
  const { language } = useContext(LanguageContext);

  const pending = bookings.filter(b => b.status === "pending");
  const confirmed = bookings.filter(b => b.status === "confirmed");
  const cancelled = bookings.filter(b => b.status === "cancelled");

  const totalBookingsLabel = getLabelByLang(translations.overview.dayHours.totalBookings, language);
  const noBookingsLabel = getLabelByLang(translations.overview.dayHours.noBookings, language);
  const closedTodayLabel = getLabelByLang(translations.overview.dayHours.closedToday, language);
  const openLabel = getLabelByLang(translations.overview.dayHours.open, language);
  const pendingLabel = getLabelByLang(translations.overview.status.pending, language);
  const confirmedLabel = getLabelByLang(translations.overview.status.confirmed, language);
  const cancelledLabel = getLabelByLang(translations.overview.status.cancelled, language);

  return (
    <div className="overview-selectedDate">
      <div className="overview-day-box">
        <h3 className="content-day-hours-box">
          🕒 {isOff ? closedTodayLabel : `${openLabel}: ${open} - ${close}`}
        </h3>
      </div>

      <div className="overview-day-box">
        {bookings.length > 0 ? (
          <div title={totalBookingsLabel}>📅 {totalBookingsLabel} - {bookings.length}</div>
        ) : (
          <div title={totalBookingsLabel}>{noBookingsLabel} - {bookings.length}</div>
        )}

        {pending.length > 0 && (
          <StatusSection title={pendingLabel} icon="/images/pending.png" count={pending.length} bookings={pending} />
        )}
        {confirmed.length > 0 && (
          <StatusSection title={confirmedLabel} icon="/images/confirmed.png" count={confirmed.length} bookings={confirmed} />
        )}
        {cancelled.length > 0 && (
          <StatusSection title={cancelledLabel} icon="/images/cancelled.png" count={cancelled.length} bookings={cancelled} />
        )}
      </div>
    </div>
  );
};

export default DayOpeningHours;
