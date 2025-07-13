import React, { useContext, useEffect } from "react";
import moment from "moment";
import "./CustomWeekHeader.css";
import { LanguageContext } from "../context/LanguageContext";

const CustomWeekHeader = ({ currentDate, onDayClick, currentView, workingDays }) => {
  const { language } = useContext(LanguageContext);

  // 👇 Set moment locale based on language
  useEffect(() => {
    moment.locale(language === "ar" ? "ar" : language === "he" ? "he" : "en");
  }, [language]);

  const days = [];

  // 👇 Always force week to start on Sunday
  const startOfWeek = moment(currentDate).day(0); // Sunday

  for (let i = 0; i < 7; i++) {
    const day = moment(startOfWeek).clone().add(i, "days");
    days.push(day);
  }

  // 👇 Match against English workingDays
  const dayIndexToEnglishName = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
  ];

  return (
    <div className="b-calendarrow-header">
      <div className="b-calendarrow-header-container">
        <div className="b-cal-cell-header b-cal-empty-corner" aria-hidden="true"></div>

        {days.map((day) => {
          const isSelected = moment(day).isSame(currentDate, "day");
          const isToday = moment(day).isSame(moment(), "day");
          const isDayView = currentView === "day";

          const englishDayName = dayIndexToEnglishName[day.day()];
          const isWorkingDay = workingDays.includes(englishDayName);
          const isNonWorkingDay = !isWorkingDay;

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
                {day.locale(language).format("ddd")} {/* Short name like أحد / Sun / ראשון */}
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