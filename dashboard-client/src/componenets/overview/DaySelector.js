import React, { useContext } from "react";
import "./DaySelector.css";
import { LanguageContext } from "../../context/LanguageContext";
import translations from "../../translate/translations";

const DaySelector = ({ selectedDate, onChange, weekSummary }) => {
  const { language } = useContext(LanguageContext);
  const today = new Date();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  const t = translations.overview || {};
  const offText = t.off?.[language] || "OFF";
  const bookingText = t.booking?.[language] || "booking";
  const bookingsText = t.bookings?.[language] || "bookings";

  return (
    <div className="day-scroll-wrapper">
      <div className="overview-day-selector">
        {days.map((date, idx) => {
          const isSelected = date.toDateString() === selectedDate.toDateString();
          const dateStr = date.toISOString().split("T")[0];
          const dayInfo = weekSummary?.[dateStr];
          const isOff = dayInfo?.isOff;
          const bookingsCount = dayInfo?.totalBookings || 0;

          return (
            <div
              key={idx}
              className={`day-box ${isSelected ? "selected" : ""} ${isOff ? "off-day" : ""}`}
              onClick={() => onChange(date)}
            >
              <div className="weekday">
                {date.toLocaleDateString(language === "he" ? "he-IL" : language === "ar" ? "ar-EG" : "en-GB", { weekday: "short" })}
              </div>
              <div className="day-num">{date.getDate()}</div>
              <div className="booking-count">
                {isOff
                  ? offText
                  : `${bookingsCount} ${bookingsCount === 1 ? bookingText : bookingsText}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DaySelector;
