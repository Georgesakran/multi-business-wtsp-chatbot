import React, { useEffect, useState, useCallback } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import CalendarPicker from "react-calendar";
import "react-calendar/dist/Calendar.css";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import axios from "../services/api";
import Modal from "react-modal";
import "../styles/CalendarPage.css";
import CustomWeekHeader from "../componenets/CustomWeekHeader"; // adjust path as needed


const localizer = momentLocalizer(moment);
Modal.setAppElement("#root");

const CalendarView = () => {
  const ownerData = JSON.parse(localStorage.getItem("user"));
  const businessId = ownerData?.businessId;

  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState("week");
  const [businessConfig, setBusinessConfig] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [filters, setFilters] = useState({
    confirmed: true,
    pending: true,
    cancelled: true,
  });

  const [formData, setFormData] = useState({
    customerName: "",
    phoneNumber: "",
    service: "",
    date: "",
    time: "",
    status: "pending",
  });

  //const isMobile = window.innerWidth <= 480;

  const fetchBusinessConfig = useCallback(async () => {
    try {
      const res = await axios.get(`/businesses/${businessId}`);
      setBusinessConfig(res.data.config?.booking);
    } catch (err) {
      console.error("❌ Failed to fetch business config:", err.message);
    }
  }, [businessId]);

  const getColorByStatus = (status) => {
    switch (status) {
      case "confirmed": return "#4CAF50";
      case "cancelled": return "#f44336";
      case "pending": default: return "#FFC107";
    }
  };

  const fetchBookings = useCallback(async () => {
    try {
      const res = await axios.get(`/bookings/${businessId}`);
      const formatted = res.data.map((booking) => {
        const start = new Date(`${booking.date}T${booking.time}`);
        const end = new Date(start.getTime() + 30 * 60000);
        return {
          id: booking._id,
          title: `${booking.customerName} - ${booking.service}`,
          start,
          end,
          allDay: false,
          status: booking.status,
          resource: { color: getColorByStatus(booking.status) },
          ...booking,
        };
      });
      setEvents(formatted);
    } catch (err) {
      console.error("❌ Failed to fetch bookings:", err.message);
    }
  }, [businessId]);

  useEffect(() => {
    if (businessId) {
      fetchBusinessConfig();
      fetchBookings();
    }
  }, [businessId, fetchBusinessConfig, fetchBookings]);

  useEffect(() => {
    const mobile = window.innerWidth <= 480;
    if (mobile) setCurrentView("day");
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedEvent) {
        await axios.put(`/bookings/${selectedEvent.id}`, { ...formData, businessId });
      } else {
        await axios.post("/bookings", { ...formData, businessId });
      }
      setFormData({ customerName: "", phoneNumber: "", service: "", date: "", time: "", status: "pending" });
      setSelectedEvent(null);
      setSelectedSlot(null);
      fetchBookings();
    } catch (err) {
      console.error("❌ Failed to save booking:", err.message);
    }
  };

  const minTime = businessConfig?.openingTime ? moment(businessConfig.openingTime, "HH:mm").toDate() : new Date(2023, 1, 1, 8);
  const maxTime = businessConfig?.closingTime ? moment(businessConfig.closingTime, "HH:mm").toDate() : new Date(2023, 1, 1, 20);

  const filteredEvents = events.filter(e => filters[e.status]);
  const getStep = () => {
    switch (currentView) {
      case "day":
        return "day";
      case "month":
        return "month";
      case "agenda":
        return "year"; // or 'week' if preferred
      case "week":
      default:
        return "week";
    }
  };
  const getLabel = (date, view) => {
    const m = moment(date);
    switch (view) {
      case "day":
        return m.format("dddd, MMMM D, YYYY");
      case "week":
        return m.format("[Week] WW, MMMM YYYY");
      case "month":
        return m.format("MMMM YYYY");
      case "agenda":
        return `Agenda View: ${m.format("MMMM YYYY")}`;
      default:
        return m.format("MMMM D, YYYY");
    }
  };
  
  return (
    <div className="calendar-layout">
      {/* Custom Toolbar Header */}
      <div className="calendar-header">
      <div className="calendar-header-left">
  <button onClick={() => setCurrentDate(new Date())}>Today</button>

  <button
    onClick={() => {
      const newDate = moment(currentDate).subtract(1, getStep()).toDate();
      setCurrentDate(newDate);
    }}
  >
    ‹
  </button>

  <button
    onClick={() => {
      const newDate = moment(currentDate).add(1, getStep()).toDate();
      setCurrentDate(newDate);
    }}
  >
    ›
  </button>

  <span className="calendar-header-label">
    {getLabel(currentDate, currentView)}
  </span>
</div>

        <div className="calendar-header-center" />
        <div className="calendar-header-right">
          {["day", "week", "month", "agenda"].map(view => (
            <button
              key={view}
              className={currentView === view ? "active" : ""}
              onClick={() => setCurrentView(view)}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Body: Sidebar + Calendar */}
      <div className="calendar-body">
        {/* Left Sidebar */}
        <div className="calendar-sidebar">

        <CalendarPicker
          onChange={(date) => setCurrentDate(date)}
          value={currentDate}
          nextLabel="›"
          prevLabel="‹"
          showNeighboringMonth={false}
          calendarType="gregory"
          tileDisabled={({ date }) =>
            !businessConfig?.workingDays?.includes(moment(date).format("dddd"))
          }
          tileClassName={({ date }) => {
            const mDate = moment(date);
            const isSelected = mDate.isSame(currentDate, "day");
            const isToday = mDate.isSame(moment(), "day");
          
            if (isSelected) return "calendar-tile-selected";
            if (isToday) return "calendar-tile-today";
          
            return "";
          }}
          
          
        />
          <div className="status-filters">
            <label><input type="checkbox" checked={filters.pending} onChange={() => setFilters(prev => ({ ...prev, pending: !prev.pending }))}/> Pending</label>
            <label><input type="checkbox" checked={filters.confirmed} onChange={() => setFilters(prev => ({ ...prev, confirmed: !prev.confirmed }))}/> Confirmed</label>
            <label><input type="checkbox" checked={filters.cancelled} onChange={() => setFilters(prev => ({ ...prev, cancelled: !prev.cancelled }))}/> Cancelled</label>
          </div>
        </div>

        {/* Right: Calendar */}
        <div className="calendar-main">
        {["week", "day"].includes(currentView) && (
          <CustomWeekHeader
            start={moment(currentDate).startOf("week")}
            currentDate={currentDate}
            currentView={currentView}
            workingDays={businessConfig?.workingDays ?? []}
            onDayClick={(date) => {
              setCurrentDate(date);
              setCurrentView("day");
            }}
          />
        )}



        <Calendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor="start"
          endAccessor="end"
          date={currentDate}
          view={currentView}
          onNavigate={setCurrentDate}
          onView={setCurrentView}
          selectable={(slotInfo) => {
            const dayName = moment(slotInfo.start).format("dddd"); // "Monday", etc.
            return businessConfig?.workingDays?.includes(dayName); // ✅ correct
          }}
          
          min={minTime}
          max={maxTime}
          style={{ height: 650 }}
          onSelectEvent={(event) => {
            setSelectedEvent(event);
            setFormData({ ...event });
          }}
          onSelectSlot={(slot) => {
            const date = moment(slot.start).format("YYYY-MM-DD");
            const time = moment(slot.start).format("HH:mm");
            setSelectedSlot(slot);
            setFormData({
              customerName: "",
              phoneNumber: "",
              service: "",
              date,
              time,
              status: "pending",
            });
          }}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: event.resource?.color || "#2196f3",
              color: "white",
              borderRadius: "6px",
              padding: "4px",
            },
          })}
          components={{
            timeGridHeader: () => null, // ⛔ hides week/day headers
            month: {
              header: () => null, // ⛔ hides month view day headers
            },
          }}
        />


        </div>
      </div>

      <Modal
        isOpen={!!selectedEvent || !!selectedSlot}
        onRequestClose={() => {
          setSelectedEvent(null);
          setSelectedSlot(null);
        }}
        className="ReactModal__Content no-default-modal-style"
        overlayClassName="ReactModal__Overlay no-default-overlay-style"
      >
        <form className="booking-model-form" onSubmit={handleFormSubmit}>
          <input placeholder="Customer Name" value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} required />
          <input placeholder="Phone" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} required />
          <input placeholder="Service" value={formData.service} onChange={(e) => setFormData({ ...formData, service: e.target.value })} required />
          <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
          <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} required />
          <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button type="submit">{selectedEvent ? "Update" : "Create"}</button>
        </form>
      </Modal>
    </div>
  );
};

export default CalendarView;