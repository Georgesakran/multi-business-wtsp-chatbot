import React from "react";
import moment from "moment";
import "./CustomWeekHeader.css";

const CustomWeekHeader = ({ start, onDayClick, currentDate, currentView, workingDays }) => {
  const days = [];


  for (let i = 0; i < 7; i++) {
    const day = moment(start).clone().add(i, "days");
    days.push(day);
  }

  return (
    <div className="b-calendarrow-header">
      <div className="b-calendarrow-header-container">
        <div className="b-cal-cell-header b-cal-empty-corner" aria-hidden="true"></div>

        {days.map((day) => {
            const isSelected= moment(day).isSame(currentDate, "day");
            const isWorkingDay = workingDays.includes(day.format("dddd"));
            const isNonWorkingDay = !isWorkingDay;          
            const isDayView = currentView === "day";
            const isToday = moment(day).isSame(moment(), "day");


          return (
            <div
              key={day.format("YYYY-MM-DD")}
              data-header-date={day.format("YYYY-MM-DD")}
              className={`b-cal-cell-header ${
              isNonWorkingDay ? "b-weekend b-nonworking-day" : ""
              } b-day-of-week-${day.day()}`}
              role="button"
              tabIndex="0"
              onClick={() => onDayClick(day.toDate())}
              style={{ cursor: "pointer" }}
            >
              <div className="b-day-name-part b-day-name-day b-day-name-short">
                {day.format("dd")[0]}
              </div>
              <div
                className={`b-day-name-part b-day-name-date ${
                  (isDayView && isSelected) || (!isDayView && isToday) ? "active-day-circle" : ""
                }`}
              >
                {day.format("D")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CustomWeekHeader;
