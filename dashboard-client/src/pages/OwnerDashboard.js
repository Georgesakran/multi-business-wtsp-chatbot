import React, { useState, useEffect } from "react";
import "../styles/OwnerDashboard.css";
import StatCard from "../componenets/dashboard/StatCard";
import StaticsBarStatus from "../componenets/dashboard/StaticsBarStatus";
import StaticsBySource from "../componenets/dashboard/StaticsBarSource";
import axios from "../services/api";
import TopClients from "../componenets/dashboard/TopClients";
import TopServices from "../componenets/dashboard/TopServices";
import ChatTimeDistribution from "../componenets/dashboard/ChatTimeDistribution";
import StatsPerWeekdayChart from "../componenets/dashboard/StatsPerWeekdayChart";


// OwnerDashboard component for business owners to view booking and product statistics
// This component fetches and displays various statistics based on the business type (booking or product)
// It includes filters for date ranges and displays statistics in a user-friendly format
// It also handles responsiveness for mobile devices

const OwnerDashboard = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const businessId = user?.businessId;
  const businessType = user?.businessType;
  const [filter, setFilter] = useState("month"); // default
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [customDates, setCustomDates] = useState({ from: "", to: "" });
  const [bookingStats, setBookingStats] = useState(null);
  const [productStats, setProductStats] = useState(null); 
  const [chatbotTimeData, setChatbotTimeData] = useState(null);
  const [weekdayBookings, setWeekdayBookings] = useState(null);
  const [weekdayOrders, setWeekdayOrders] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  


    useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth <= 768);
      };
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
      const today = new Date();
      let from, to;
  
      if (filter === "day") {
        from = to = today.toISOString().split("T")[0];
      } else if (filter === "week") {
        const start = new Date(today);
        start.setDate(today.getDate() - 6);
        from = start.toISOString().split("T")[0];
        to = today.toISOString().split("T")[0];
      } else if (filter === "month") {
        const start = new Date(today);
        start.setDate(today.getDate() - 29);
        from = start.toISOString().split("T")[0];
        to = today.toISOString().split("T")[0];
      } else if (filter === "year") {
        const start = new Date(today);
        start.setFullYear(today.getFullYear() - 1);
        from = start.toISOString().split("T")[0];
        to = today.toISOString().split("T")[0];
      } else if (filter === "custom") {
        from = customDates.from;
        to = customDates.to;
      }
  
      setDateRange({ from, to });
    }, [filter, customDates]);

    useEffect(() => {
      if (!businessId || !dateRange.from || !dateRange.to) return;
    
      const fetchAllDashboardStats = async () => {
        try {
          const res = await axios.get(
            `/dashboard/${businessId}/full-overview?from=${dateRange.from}&to=${dateRange.to}`
          );
    
          const {
            bookingStats,
            productStats,
            chatbotTime,
            weekdayBookings,
            weekdayOrders,
          } = res.data;

          if (["booking", "mixed"].includes(businessType)) {
            setBookingStats(bookingStats);
            setWeekdayBookings(weekdayBookings);
          }

          if (["product", "mixed"].includes(businessType)) {
            setProductStats(productStats);
            setWeekdayOrders(weekdayOrders);
          }
    
          setChatbotTimeData(chatbotTime);

        } catch (err) {
          console.error("❌ Failed to fetch full dashboard stats:", err);
        }
      };
    
      fetchAllDashboardStats();
    }, [businessId, businessType, dateRange]);



  
  return (
    <div className="dashboard-wrapper">
      {/* Dashboard Title */}
      {isMobile && <h2 className="dashboard-title">📊 Dashboard Statistics</h2>}

      {/* Filter Section */}
      <div className="filter-bar">
        {["day", "week", "month", "year", "custom"].map((key) => (
          <button
            key={key}
            className={`filter-btn ${filter === key ? "active" : ""}`}
            onClick={() => setFilter(key)}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>

      {/* Date Range Viewer */}
      <div className="date-range-view">
        {filter !== "custom" ? (
          <div className="date-range-display">
            <span>From: {dateRange.from}</span>
            <span>To: {dateRange.to}</span>
          </div>
        ) : (
          <div className="custom-date-inputs">
            <label>
              From:
              <input
                type="date"
                value={customDates.from}
                onChange={(e) =>
                  setCustomDates({ ...customDates, from: e.target.value })
                }
              />
            </label>
            <label>
              To:
              <input
                type="date"
                value={customDates.to}
                onChange={(e) =>
                  setCustomDates({ ...customDates, to: e.target.value })
                }
              />
            </label>
          </div>
        )}
      </div>


      {/* Statics of Booking / Products */}
      <div className="stats-cards-row">
        {["booking", "mixed"].includes(businessType) && (
          <>
            <StatCard
              label="Pending Bookings"
              value={bookingStats?.statusCounts?.pending || 0}
              color="#ffa726"
              icon="⏳"
            />
            <StatCard
              label="Total Bookings"
              value={bookingStats?.total || 0}
              color="#42a5f5"
              icon="📅"
            />
            <StatCard
              label="Most Booked"
              value={bookingStats?.mostBookedService?.[0] || "N/A"}
              color="#66bb6a"
              icon="🔥"
            />
          </>
        )}
      </div>  
       <div className="stats-cards-row">
        {["product", "mixed"].includes(businessType) && (
          <>
            <StatCard
              label="Pending Bookings"
              value={productStats?.statusCounts?.pending || 0}
              color="#ffa726"
              icon="⏳"
            />
            <StatCard
              label="Total Bookings"
              value={productStats?.total || 0}
              color="#42a5f5"
              icon="📅"
            />
            <StatCard
              label="Most Booked"
              value={productStats?.mostBookedService?.[0] || "N/A"}
              color="#66bb6a"
              icon="🔥"
            />
          </>
        )}
      </div> 



      <div className="Bars-stats">
        {/* Booking Status Bars for Booking / MIX */}
        {["booking", "mixed"].includes(businessType) && bookingStats && (
          <StaticsBarStatus
            statusCounts={bookingStats.statusCounts}
            total={bookingStats.total}
          /> 
        )}

        {/* Booking Status Bars for product / MIX */}
        {["product", "mixed"].includes(businessType) && productStats && (
          <StaticsBarStatus
            statusCounts={productStats.statusCounts}
            total={productStats.total}
          />
        )}

        {/* Booking Appointments Stats By Source */}
        {["booking", "mixed"].includes(businessType) && bookingStats && (
          <StaticsBySource
            sourceCounts={bookingStats.sourceCounts}
            total={bookingStats.total}
          />
        )}

        {/* Orders Products Stats By Source */}
        {["product", "mixed"].includes(businessType) && productStats && (
          <StaticsBySource
            sourceCounts={productStats.sourceCounts}
            total={productStats.total}
          />
        )}
      </div>



      <div className="top-stats">
        
          {["booking", "mixed"].includes(businessType) && bookingStats && (
              <TopClients title="Top Booking Clients" clients={bookingStats.topClients} />
          )}

          {["product", "mixed"].includes(businessType) && productStats && (
              <TopClients title="Top Order Clients" clients={productStats.topClients} />
          )}

          {["booking", "mixed"].includes(businessType) && bookingStats?.topServices && (
              <TopServices title="Top Booking Services" services={bookingStats.topServices} />
          )}

          {["product", "mixed"].includes(businessType) && productStats?.topServices && (
              <TopServices title="Top Order Services" services={productStats.topServices} />
          )}
      </div>


      <div className="dashboard-charts1">
        {/* Chat Time Distribution Chart */}
        <div className="chat-messages-stats">
            {["booking", "mixed", "product"].includes(businessType) && (
              <ChatTimeDistribution timeData={chatbotTimeData?.timeBuckets} />
            )}
        </div>

        {/* Weekday Bookings and Orders Charts */}
        <div className="weekday-stats">
            {["booking", "mixed"].includes(businessType) && weekdayBookings && (
              <StatsPerWeekdayChart title="📅 Bookings per Day" data={weekdayBookings} />
            )}

            {["product", "mixed"].includes(businessType) && weekdayOrders && (
              <StatsPerWeekdayChart title="🛒 Orders per Day" data={weekdayOrders} />
            )}
        </div>
      </div>  
    </div>
  );
};

export default OwnerDashboard;