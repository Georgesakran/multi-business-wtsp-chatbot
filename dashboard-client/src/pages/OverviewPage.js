import React, { useEffect, useState } from "react";
import axios from "../services/api";
import WelcomeMessage from "../componenets/overview/WelcomeMessage";
import DaySelector from "../componenets/overview/DaySelector";
import DayOpeningHours from "../componenets/overview/DayOpeningHours";
import "../styles/OverviewPage.css";

const OverviewPage = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const businessId = user?.businessId;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekSummary, setWeekSummary] = useState({});

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
  const selectedOverview = weekSummary[selectedDateStr];

  return (
    <div className="overview-container">
      <WelcomeMessage
        nameEnglish={user.businessName}
        username={user.username}
      />
      <DaySelector
        selectedDate={selectedDate}
        onChange={setSelectedDate}
        weekSummary={weekSummary}
      />

      {selectedOverview && (
        <DayOpeningHours
          isOff={selectedOverview.isOff}
          open={selectedOverview.open}
          close={selectedOverview.close}
          bookingsCount={selectedOverview.totalBookings}
          bookings={selectedOverview.bookings || []} // 👈 pass detailed bookings here
        />
      )}
    </div>
  );
};

export default OverviewPage;
