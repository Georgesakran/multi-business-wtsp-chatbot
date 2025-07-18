import React, { useEffect, useState } from "react";
import axios from "../services/api";
import WelcomeMessage from "../componenets/overview/WelcomeMessage";
import DaySelector from "../componenets/overview/DaySelector";
import DayOpeningHours from "../componenets/overview/DayOpeningHours";
import "../styles/OverviewPage.css"; // Assuming you have some styles for the overview page

const OverviewPage = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const businessId = user?.businessId;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekSummary, setWeekSummary] = useState({}); // renamed to match what you're actually setting

  useEffect(() => {
    const fetchWeekSummary = async () => {
      try {
        const res = await axios.get(`/overview/${businessId}/week-summary`);
        setWeekSummary(res.data.days);
      } catch (err) {
        console.error("❌ Failed to fetch week summary", err);
      }
    };
    fetchWeekSummary();
  }, [businessId]);

  const selectedDateStr = selectedDate.toISOString().split("T")[0];
  const selectedOverview = weekSummary[selectedDateStr]; // This gives us the day's info

  return (
    <div className="overview-container">
      <WelcomeMessage businessName={user.businessName} username={user.username} />
      <DaySelector
        selectedDate={selectedDate}
        onChange={setSelectedDate}
        weekSummary={weekSummary} // pass this to show booking counts under date
      />
      {selectedOverview && <DayOpeningHours {...selectedOverview} />}
    </div>
  );
};

export default OverviewPage;