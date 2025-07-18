import React from "react";
import "./DaySelector.css";

const DaySelector = ({ selectedDate, onChange, weekSummary }) => {
  const today = new Date();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

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
                {date.toLocaleDateString("en-GB", { weekday: "short" })}
              </div>
              <div className="day-num">{date.getDate()}</div>
              <div className="booking-count">
                {isOff ? "OFF" : `${bookingsCount} booking${bookingsCount !== 1 ? "s" : ""}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
  
};

export default DaySelector;