import React, { useEffect, useState, useContext } from "react";
import axios from "../services/api";
import WelcomeMessage from "../componenets/overview/WelcomeMessage";
import DaySelector from "../componenets/overview/DaySelector";
import DayOpeningHours from "../componenets/overview/DayOpeningHours";
import InventoryAlerts from "../componenets/overview/InventoryAlerts";
import RecentOrders from "../componenets/overview/RecentOrders";
import { LanguageContext } from "../context/LanguageContext";

import "../styles/OverviewPage.css";

const OverviewPage = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const businessId = user?.businessId;
  const { language } = useContext(LanguageContext);
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekSummary, setWeekSummary] = useState({});
  const [businessName, setBusinessName] = useState({ en: "", ar: "", he: "" });
  const [inventoryAlerts, setInventoryAlerts] = useState([]);
  const [ordersByDate, setOrdersByDate] = useState({});


  useEffect(() => {
    const fetchWeekSummary = async () => {
      try {
        const res = await axios.get(`/overview/${businessId}/week-summary`);
    
        setWeekSummary(res.data.days);
        setInventoryAlerts(res.data.inventoryAlerts || []);
        setOrdersByDate(res.data.ordersByDate || {});
        const backendName = res.data.businessName;
        const formattedBusinessName = {
          en: backendName.en || "",
          ar: backendName.ar || "",
          he: backendName.he || "",
        };
        setBusinessName(formattedBusinessName);
      } catch (err) {
        console.error("❌ Failed to fetch week summary", err);
      }
    };
  
    fetchWeekSummary();
  }, [businessId]);



  const selectedDateStr = selectedDate.toISOString().split("T")[0];
  const selectedOverview = weekSummary[selectedDateStr];

  return (
    <div className={`overview-container ${["ar", "he"].includes(language) ? "rtl" : "ltr"}`}>
      <WelcomeMessage business={businessName} username={user.username} />

      {(user.businessType === "booking" || user.businessType === "mixed") && (
        <>
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
              bookings={selectedOverview.bookings || []}
            />
          )}
        </> 
      )}

      {(user.businessType === "product" || user.businessType === "mixed") && (
        <>
          <InventoryAlerts alerts={inventoryAlerts} />
          <RecentOrders ordersByDate={ordersByDate} />
        </>
      )}
    </div>
  );
};

export default OverviewPage;
