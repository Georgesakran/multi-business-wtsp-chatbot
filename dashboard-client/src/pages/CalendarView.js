import React, { useEffect, useState, useCallback,useContext } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import CalendarPicker from "react-calendar";
import "react-calendar/dist/Calendar.css";
import moment from "moment";
import "moment/locale/ar";
import "moment/locale/he";
import { toast } from "react-toastify";
import "react-big-calendar/lib/css/react-big-calendar.css";
import axios from "../services/api";
import Modal from "react-modal";
import ConfirmationModal from "../componenets/ConfirmationModal"; // adjust path as needed
import { useRef } from "react";
import { LanguageContext } from "../context/LanguageContext";
import translations from "../translate/translations";
import { getLabelByLang } from "../translate/getLabelByLang"; // this handles lang fallback
import {
  isValidPhoneNumber,
  isValidCustomerName,
  isDateTimeInFuture,
  isTimeWithinWorkingHours,
} from "../utils/bookingValidation";

import "../styles/CalendarPage.css";
import CustomWeekHeader from "../componenets/CustomWeekHeader"; // adjust path as needed


const localizer = momentLocalizer(moment);
Modal.setAppElement("#root");

const CalendarView = () => {
  const { language } = useContext(LanguageContext);
  const token = localStorage.getItem("token");
  const calendarMainRef = useRef();
  const ownerData = JSON.parse(localStorage.getItem("user"));
  const businessId = ownerData?.businessId;
  const [services, setServices] = useState([]);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const isMobile = window.innerWidth <= 480;
  const [previewEvent, setPreviewEvent] = useState(null);
  const previewRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState("week");
  const [businessConfig, setBusinessConfig] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null); 
  const [showUpdateModal, setShowUpdateModal] = useState(false);
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
// ---- service helpers (new + legacy safe) ----
const getServiceLabel = (bookingOrEvent, lang) => {
  const snap = bookingOrEvent?.serviceSnapshot?.name;
  if (snap && (snap[lang] || snap.en)) return snap[lang] || snap.en;

  // legacy fallback (old rows)
  const legacy = bookingOrEvent?.service;
  if (legacy && typeof legacy === "object") return legacy[lang] || legacy.en || "N/A";
  if (typeof legacy === "string" && legacy.trim()) return legacy;

  return "N/A";
};

const getDurationMinutes = (bookingOrEvent) => {
  const d = bookingOrEvent?.serviceSnapshot?.duration;
  return Number.isFinite(d) && d > 0 ? d : 30; // default 30 min
};

  const fetchBusinessConfig = useCallback(async () => {
    try {
      const res = await axios.get(`/businesses/${businessId}`);
      setBusinessConfig(res.data.config?.booking);
    } catch (err) {
      toast.error(getLabelByLang(translations.calendarPage.fetchBusinessConfigError, language));
    }
  }, [businessId, language]);

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
        const duration = getDurationMinutes(booking);
        const end = new Date(start.getTime() + duration * 60000);
  
        return {
          id: booking._id,
          start,
          end,
          allDay: false,
          status: booking.status,
          resource: { color: getColorByStatus(booking.status) },
  
          // keep full booking for preview / edit
          ...booking,
  
          // title uses new snapshot (fallback safe)
          title: `${booking.customerName} - ${getServiceLabel(booking, language)}`,
        };
      });
      setEvents(formatted);
    } catch (err) {
      toast.error(getLabelByLang(translations.calendarPage.fetchBookingsError, language));
    }
  }, [businessId, language]);


  const fetchServices = useCallback(async () => {
    try {
      const res = await axios.get("/services", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setServices(res.data.filter((s) => s.isActive));
    } catch (err) {
      toast.error(getLabelByLang(translations.calendarPage.fetchServicesError, language));
    }
  }, [token, language]);
  

  useEffect(() => {
    if (businessId) {
      fetchBusinessConfig();
      fetchBookings();
      fetchServices();
    }
  }, [businessId, fetchBusinessConfig, fetchBookings,fetchServices]);

  useEffect(() => {
    if (isMobile) setCurrentView("day");
  }, [isMobile]);


  useEffect(() => {
    const handleClickOrScroll = (e) => {
      if (previewRef.current && !previewRef.current.contains(e.target)) {
        setPreviewEvent(null); // close the preview
      }
    };
  
    document.addEventListener("mousedown", handleClickOrScroll);
    window.addEventListener("scroll", handleClickOrScroll, true); // `true` = capture phase
  
    return () => {
      document.removeEventListener("mousedown", handleClickOrScroll);
      window.removeEventListener("scroll", handleClickOrScroll, true);
    };
  }, []);

  useEffect(() => {
    const lang = language === "ar" ? "ar" : language === "he" ? "he" : "en";
    moment.locale(lang);
  
    // 🔥 Force week to start on Sunday no matter the locale
    moment.updateLocale(lang, {
      week: {
        dow: 0, // Sunday
        doy: 6
      },
      preparse: (str) => str,
      postformat: (str) => str.replace(/\d/g, (d) => "0123456789"[d]),
    });
  }, [language]);
  



  const handleUpdateAttempt = () => {
    const { customerName, phoneNumber, date, time } = formData;
  
    const config = {
      openingTime: businessConfig?.openingTime,
      closingTime: businessConfig?.closingTime,
    };
  
    let isValid = true;
  
    if (!isValidCustomerName(customerName)) {
      isValid = false;
      toast.error(getLabelByLang(translations.bookingsPage.toastNotValidcustomerName, language));
    }
  
    if (!isValidPhoneNumber(phoneNumber)) {
      isValid = false;
      toast.error(getLabelByLang(translations.bookingsPage.toastNotValidPhone, language));
    }
  
    if (!isDateTimeInFuture(date, time)) {
      isValid = false;
      toast.error(getLabelByLang(translations.bookingsPage.toastNotValidDate, language));
    }
  
    if (!isTimeWithinWorkingHours(time, config.openingTime, config.closingTime)) {
      isValid = false;
      toast.error(
        getLabelByLang(translations.bookingsPage.toastNotValidTime, language)
          .replace("{openingTime}", config.openingTime)
          .replace("{closingTime}", config.closingTime)
      );
    }
  
    if (isValid) {
      setShowUpdateModal(true); // ✅ show confirmation modal
    }
  };
  
  const confirmUpdateBooking = async () => {
    if (!selectedEvent) return;
  
    try {
      const payload = {
        businessId,
        customerName: formData.customerName,
        phoneNumber: formData.phoneNumber,
        date: formData.date,
        time: formData.time,
        status: formData.status,
        serviceId: formData.serviceId || null, // 👈 let backend rebuild snapshot
        source: "manual",
      };
  
      await axios.put(`/bookings/${selectedEvent.id}`, payload);
      toast.success(getLabelByLang(translations.calendarPage.saveBookingSuccess, language));
  
      setFormData({
        customerName: "",
        phoneNumber: "",
        serviceId: "",
        date: "",
        time: "",
        status: "pending",
      });
  
      setSelectedEvent(null);
      setSelectedSlot(null);
      setShowUpdateModal(false);
      fetchBookings();
    } catch (err) {
      toast.error(getLabelByLang(translations.calendarPage.saveBookingError, language));
    }
  };
  
  

  const handleDeleteBooking = async () => {
    if (!eventToDelete) return;
  
    try {
      await axios.delete(`/bookings/${eventToDelete.id}`);
      toast.success(getLabelByLang(translations.calendarPage.deleteBookingSuccess, language));
      setPreviewEvent(null);
      setShowDeleteModal(false);
      setEventToDelete(null);
      fetchBookings();
    } catch (err) {
      toast.error(getLabelByLang(translations.calendarPage.deleteBookingError, language));
    }
  };

  

  const minTime = businessConfig?.openingTime ? moment(businessConfig.openingTime, "HH:mm").toDate() : new Date(2023, 1, 1, 8);
  const maxTime = businessConfig?.closingTime ? moment(businessConfig.closingTime, "HH:mm").toDate() : new Date(2023, 1, 1, 20);

  const filteredEvents = events.filter(e => filters[e.status]);

  const formattedEvents = filteredEvents.map((event) => ({
    ...event,
    title: `${event.customerName} - ${getServiceLabel(event, language)}`
  }));
  
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
  
    // 👇 set the locale based on selected language
    if (language === "ar") m.locale("ar");
    else if (language === "he") m.locale("he");
    else m.locale("en");
  
    if (isMobile) {
      switch (view) {
        case "day":
          return m.format("DD/MM/YY");
        case "week":
          const startOfWeek = moment(date).startOf("week").locale(m.locale());
          const endOfWeek = moment(date).endOf("week").locale(m.locale());
          return `${startOfWeek.format("DD")}-${endOfWeek.format("DD/MM/YY")}`;
        case "month":
          return m.format("MM, YYYY");
        case "agenda":
          return `${language === "ar" ? "الأجندة" : language === "he" ? "אג׳נדה" : "Agenda"}: ${m.format("MM/YY")}`;
        default:
          return m.format("DD/MM/YY");
      }
    } else {
      switch (view) {
        case "day":
          return m.format("dddd, D MMMM YYYY");
        case "week":
          return `${language === "ar" ? "الأسبوع" : language === "he" ? "שבוע" : "Week"} ${m.format("WW")}, ${m.format("MMMM YYYY")}`;
        case "month":
          return m.format("MMMM YYYY");
        case "agenda":
          return `${language === "ar" ? "عرض الأجندة" : language === "he" ? "תצוגת אג׳נדה" : "Agenda View"}: ${m.format("MMMM YYYY")}`;
        default:
          return m.format("MMMM D, YYYY");
      }
    }

  };
  
 

  
  return (

  <div className={`calendar-layout ${["ar", "he"].includes(language) ? "rtl" : "ltr"}`}>
    {/* Custom Toolbar Header */}
      <div className="calendar-header">
        <div className="calendar-header-left">
          <button onClick={() => setCurrentDate(new Date())}>
            {getLabelByLang(translations.calendarPage.today, language)}
          </button>
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

        <div className="calendar-header-right calendar-view-dropdown">
          {/* Desktop view */}
          <div className="desktop-view-buttons">
            {["day", "week", "month", "agenda"].map((view) => (
              <button
                key={view}
                className={currentView === view ? "active" : ""}
                onClick={() => setCurrentView(view)}
              >
                {getLabelByLang(translations.calendarPage.viewOptions[view], language)}
              </button>
            ))}
          </div>

          {/* Mobile view */}
          <div className="mobile-view-dropdown">
            <button
              onClick={() => setViewMenuOpen((prev) => !prev)}
              className="dropdown-toggle"
            >
              ☰
            </button>
            {viewMenuOpen && (
              <div className="dropdown-menu">
                {["day", "week", "month", "agenda"].map((view) => (
                  <button
                    key={view}
                    className={currentView === view ? "active" : ""}
                    onClick={() => {
                      setCurrentView(view);
                      setViewMenuOpen(false);
                    }}
                  >
                    {getLabelByLang(translations.calendarPage.viewOptions[view], language)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>


      </div>

      {/* Main Body: Sidebar + Calendar */}
      <div className="calendar-body">
        {/* Left Sidebar */}
        <div className="calendar-sidebar">

        <CalendarPicker
          value={currentDate}
          onChange={setCurrentDate}
          locale={language}
          nextLabel="›"
          prevLabel="‹"
          formatShortWeekday={(locale, date) =>
            new Intl.DateTimeFormat(language, { weekday: 'short' }).format(date)
          }
          formatMonthYear={(locale, date) =>
            new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' }).format(date)
          }
        />

        <div className="status-filters">
          <label>
            <input
              type="checkbox"
              checked={filters.pending}
              onChange={() =>
                setFilters((prev) => ({ ...prev, pending: !prev.pending }))
              }
            />
            {getLabelByLang(translations.bookingsPage.pending, language)}
          </label>
          <label>
            <input
              type="checkbox"
              checked={filters.confirmed}
              onChange={() =>
                setFilters((prev) => ({ ...prev, confirmed: !prev.confirmed }))
              }
            />
            {getLabelByLang(translations.bookingsPage.confirmed, language)}
          </label>
          <label>
            <input
              type="checkbox"
              checked={filters.cancelled}
              onChange={() =>
                setFilters((prev) => ({ ...prev, cancelled: !prev.cancelled }))
              }
            />
            {getLabelByLang(translations.bookingsPage.cancelled, language)}
          </label>
        </div>
        </div>

        {/* Right: Calendar */}
        <div className="calendar-main" style={{ position: "relative" }} ref={calendarMainRef}>
        {["week", "day"].includes(currentView) && (
          <CustomWeekHeader
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
          events={formattedEvents}
          startAccessor="start"
          endAccessor="end"
          date={currentDate}
          view={currentView}
          onNavigate={setCurrentDate}
          onView={setCurrentView}
          selectable={false}
          min={minTime}
          max={maxTime}
          style={{ height: 650 }}
          onSelectEvent={(event) => {
            if (isMobile && currentView !== "day") {
              setCurrentDate(moment(event.start).toDate());
              setCurrentView("day");
              return;
            }
          
            const calendarMain = calendarMainRef.current;
            const eventElement = Array.from(document.querySelectorAll('.rbc-event'))
              .find(el => el.textContent.includes(event.customerName));
          
            if (!eventElement || !calendarMain) return;
          
            const eventRect = eventElement.getBoundingClientRect();
            const containerRect = calendarMain.getBoundingClientRect();
          
            const PREVIEW_WIDTH = 260;
            const PREVIEW_HEIGHT = 160;
            const margin = 10;
          
            let top = eventRect.top - containerRect.top - PREVIEW_HEIGHT - margin;
          
            // Not enough space above → flip below
            if (top < margin) {
              top = eventRect.bottom - containerRect.top + margin;
            }
          
            let left = eventRect.left - containerRect.left + (eventRect.width / 2) - (PREVIEW_WIDTH / 2);
          
            const maxLeft = containerRect.width - PREVIEW_WIDTH - margin;
            const minLeft = margin;
          
            if (left < minLeft) {
              left = minLeft;
            } else if (left > maxLeft) {
              left = maxLeft;
            }
          
            setPreviewEvent(event);
          }}
          
        
          
          onSelectSlot={(slot) => {}}
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

        {previewEvent && (
          <div className="event-preview-overlay" onClick={() => setPreviewEvent(null)}>
            <div
              className="event-preview-box centered"
              onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside the box
            >

              <div className="event-preview-header">
                <div className="event-preview-title">{previewEvent.customerName}</div>
                <div className="event-preview-date">
                  {moment(previewEvent.start).format(" HH:mm")}
                  {" - "}
                  {moment(previewEvent.start).format("DD/MM/YYYY")}
                </div>  
              </div>

              <div className="event-preview-body">
                <div className="event-preview-column">

                  <div className="event-preview-row"> 
                    {getLabelByLang(translations.calendarPage.startTime, language)}&nbsp;-&nbsp;
                    {moment(previewEvent.start).format("HH:mm")}
                  </div>

                  <div className="event-preview-row"> 
                    {getLabelByLang(translations.calendarPage.endTime, language)}&nbsp;-&nbsp;
                    {moment(previewEvent.end).format("HH:mm")}
                  </div>

                  <div className="event-preview-row"> 
                    {getLabelByLang(translations.servicesPage.duration, language)}&nbsp;-&nbsp;
                    {getDurationMinutes(previewEvent)} {getLabelByLang(translations.calendarPage.minutes, language)}
                  </div>
                </div>
                <div className="event-preview-column">
                  <div>
                    {getLabelByLang(translations.calendarPage.phone, language)}&nbsp;-&nbsp;
                    {previewEvent.phoneNumber}
                  </div>

                  <div>
                    {getLabelByLang(translations.calendarPage.service, language)}&nbsp;-&nbsp;
                    {getServiceLabel(previewEvent, language)}
                  </div>

                  <div>
                    {getLabelByLang(translations.bookingsPage.status, language)}&nbsp;-&nbsp;
                    {previewEvent.status}
                  </div>
                </div>
              </div>
              <div className="event-preview-actions">
                 <button
                    onClick={() => {
                      setSelectedEvent(previewEvent);
                      setFormData({
                        // only what you actually edit:
                        id: previewEvent.id,
                        date: previewEvent.date,                // keep your shape if you store it
                        time: previewEvent.time,                // or format from previewEvent.start if needed
                        customerName: previewEvent.customerName,
                        phoneNumber: previewEvent.phoneNumber,
                        status: previewEvent.status,
                        serviceId: previewEvent.serviceId || "", // 👈 important
                      });
                      setPreviewEvent(null);
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => {
                      setEventToDelete(previewEvent);
                      setShowDeleteModal(true);
                    }}
                  >
                    🗑
                  </button>
                  <button onClick={() => setPreviewEvent(null)}>❌</button>
                </div>
            </div>
          </div>
        )}




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
          <form className="booking-model-form" onSubmit={(e) => e.preventDefault()}>
            <div 
              className="form-header"
              style={{ direction: language === "ar" || language === "he" ? "rtl" : "ltr" }}

              >  
              <h2>
                {getLabelByLang(translations.calendarPage.editBooking, language)}
              </h2>
              <button
                type="button"
                className="form-close-button"
                onClick={() => {
                  setSelectedEvent(null);
                  setSelectedSlot(null);
                }}
                style={{ 
                  right: language === "ar" || language === "he" ? "auto" : "20px" ,
                  left: language === "ar" || language === "he" ? "20px" : "auto"
                }}
              >
                 ✖️
              </button>
            </div>

            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              placeholder={getLabelByLang(translations.calendarPage.date, language)}
            />

            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              required
              placeholder={getLabelByLang(translations.calendarPage.time, language)}
            />

            <input
              placeholder={getLabelByLang(translations.calendarPage.customerName, language)}
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              required
              style={{ direction: language === "ar" || language === "he" ? "rtl" : "ltr" }}

            />

            <input
              placeholder={getLabelByLang(translations.calendarPage.phone, language)}
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              required
            />
            {/* Service Custom Dropdown */}
            <div
                className="custom-dropdown-wrapper"
                style={{ direction: language === "ar" || language === "he" ? "rtl" : "ltr" }}
              >
       <div className="custom-dropdown-header" onClick={() => setServiceDropdownOpen(!serviceDropdownOpen)}>
              {formData.serviceId
                ? getLabelByLang(services.find(s => String(s._id) === String(formData.serviceId))?.name || {}, language)
                : getLabelByLang(translations.calendarPage.selectService, language)}
              <span className="arrow">▾</span>
            </div>

            {serviceDropdownOpen && (
              <div className="custom-dropdown-list">
                {services.map((s) => (
                  <div
                    key={s._id}
                    className="custom-dropdown-option"
                    onClick={() => {
                      setFormData({ ...formData, serviceId: String(s._id) }); // 👈 store serviceId
                      setServiceDropdownOpen(false);
                    }}
                  >
                    {getLabelByLang(s.name, language)}
                  </div>
                ))}
              </div>
            )}
              
            </div>

            {/* Status Custom Dropdown */}
            <div
              className="custom-dropdown-wrapper"
              style={{ direction: language === "ar" || language === "he" ? "rtl" : "ltr" }}
            >
                <div className="custom-dropdown-header" onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}>
                {getLabelByLang(translations.calendarPage[formData.status], language)}
                <span className="arrow">▾</span>
              </div>
              {statusDropdownOpen && (
                <div className="custom-dropdown-list">
                  {["pending", "confirmed", "cancelled"].map((status) => (
                    <div
                      key={status}
                      className="custom-dropdown-option"
                      onClick={() => {
                        setFormData({ ...formData, status });
                        setStatusDropdownOpen(false);
                      }}
                    >
                      {getLabelByLang(translations.calendarPage[status], language)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="form-submit-button"
              onClick={handleUpdateAttempt} // ✅ only shows modal if valid
            >
              {getLabelByLang(translations.calendarPage.update, language)}
            </button>


          </form>

        </Modal>
        {showDeleteModal && (
          <ConfirmationModal
            title={getLabelByLang(translations.calendarPage.deleteConfirmTitle, language)}
            message={getLabelByLang(translations.calendarPage.deleteConfirmMessage, language)}
            onConfirm={handleDeleteBooking}
            onCancel={() => {
              setShowDeleteModal(false);
              setEventToDelete(null);
            }}
          />
        )}
        {showUpdateModal && (
          <ConfirmationModal
            title={getLabelByLang(translations.calendarPage.updateConfirmTitle, language)}
            message={getLabelByLang(translations.calendarPage.updateConfirmMessage, language)}
            onConfirm={confirmUpdateBooking} // ✅ real update happens here
            onCancel={() => setShowUpdateModal(false)}
          />
        )}


    </div>
  );
};

export default CalendarView;