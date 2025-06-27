import React, { useEffect, useState, useCallback } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import moment from "moment";
import axios from "../services/api";
import Modal from "react-modal";
import "../styles/CalendarPage.css";

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
  const [formData, setFormData] = useState({
    customerName: "",
    phoneNumber: "",
    service: "",
    date: "",
    time: "",
    status: "pending",
  });

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
      case "pending":
      default: return "#FFC107";
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

  const handleSlotSelect = (slot) => {
    const date = moment(slot.start).format("YYYY-MM-DD");
    const time = moment(slot.start).format("HH:mm");
    setFormData({
      customerName: "",
      phoneNumber: "",
      service: "",
      date,
      time,
      status: "pending",
    });
    setSelectedSlot(slot);
  };

  const handleEditClick = (event) => {
    setFormData({
      customerName: event.customerName,
      phoneNumber: event.phoneNumber,
      service: event.service,
      date: event.date,
      time: event.time,
      status: event.status,
    });
    setSelectedEvent(event);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedEvent) {
        await axios.put(`/bookings/${selectedEvent.id}`, { ...formData, businessId });
      } else {
        await axios.post("/bookings", { ...formData, businessId });
      }

      setFormData({
        customerName: "",
        phoneNumber: "",
        service: "",
        date: "",
        time: "",
        status: "pending",
      });
      setSelectedEvent(null);
      setSelectedSlot(null);
      fetchBookings();
    } catch (err) {
      console.error("❌ Failed to save booking:", err.message);
    }
  };

  const minTime = businessConfig?.openingTime
    ? moment(businessConfig.openingTime, "HH:mm").toDate()
    : new Date(2023, 1, 1, 8);

  const maxTime = businessConfig?.closingTime
    ? moment(businessConfig.closingTime, "HH:mm").toDate()
    : new Date(2023, 1, 1, 20);

  const disabledDays = ["Sunday", "Saturday"].filter(
    (day) => !businessConfig?.workingDays?.includes(day)
  );

  return (
    <div className="calendar-view">
      <Calendar className="custom-calendar"
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        date={currentDate}
        view={currentView}
        onNavigate={(date) => setCurrentDate(date)}
        onView={(view) => setCurrentView(view)}
        min={minTime}
        max={maxTime}
        selectable
        style={{ height: 600 }}
        onSelectEvent={handleEditClick}
        onSelectSlot={handleSlotSelect}
        dayPropGetter={(date) => {
          const dayName = moment(date).format("dddd");
          if (disabledDays.includes(dayName)) {
            return {
              style: {
                backgroundColor: "#f0f0f0",
                color: "#999",
                pointerEvents: "none",
                opacity: 0.6,
              },
            };
          }
          return {};
        }}
        eventPropGetter={(event) => ({
          style: {
            backgroundColor: event.resource?.color || "#2196F3",
            color: "white",
            borderRadius: "6px",
            padding: "5px",
          },
        })}
      />
<Modal
  isOpen={!!selectedEvent || !!selectedSlot}
  onRequestClose={() => {
    setSelectedEvent(null);
    setSelectedSlot(null);
  }}
  contentLabel="Booking Form"
  className="ReactModal__Content no-default-modal-style"
  overlayClassName="ReactModal__Overlay no-default-overlay-style"
>
  <button
    className="booking-modal-close"
    onClick={() => {
      setSelectedEvent(null);
      setSelectedSlot(null);
    }}
  >
    ✖
  </button>

  <h3>{selectedEvent ? "Edit Booking" : "Add Booking"}</h3>

  <form className="booking-model-form" onSubmit={handleFormSubmit}>
    <input
      className="booking-modal-input"
      type="text"
      placeholder="Customer Name"
      value={formData.customerName}
      onChange={(e) =>
        setFormData({ ...formData, customerName: e.target.value })
      }
      required
    />

    <input
      className="booking-modal-input"
      type="tel"
      placeholder="Phone"
      value={formData.phoneNumber}
      onChange={(e) =>
        setFormData({ ...formData, phoneNumber: e.target.value })
      }
      required
    />

    <input
      className="booking-modal-input"
      type="text"
      placeholder="Service"
      value={formData.service}
      onChange={(e) =>
        setFormData({ ...formData, service: e.target.value })
      }
      required
    />

    <input
      className="booking-modal-input"
      type="date"
      value={formData.date}
      onChange={(e) =>
        setFormData({ ...formData, date: e.target.value })
      }
      required
    />

    <input
      className="booking-modal-input"
      type="time"
      value={formData.time}
      onChange={(e) =>
        setFormData({ ...formData, time: e.target.value })
      }
      required
    />

    <select
      className="booking-modal-select"
      value={formData.status}
      onChange={(e) =>
        setFormData({ ...formData, status: e.target.value })
      }
    >
      <option value="pending">Pending</option>
      <option value="confirmed">Confirmed</option>
      <option value="cancelled">Cancelled</option>
    </select>

    <button className="booking-modal-submitBtn" type="submit">
      {selectedEvent ? "Update Booking" : "Create Booking"}
    </button>
  </form>
</Modal>
    </div>
  );
};

export default CalendarView;