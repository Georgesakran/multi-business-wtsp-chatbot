import React, { useEffect, useState, useCallback, useMemo , useContext} from "react";
import { LanguageContext } from "../context/LanguageContext";
import translations from "../translate/translations";
import { getLabelByLang } from "../translate/getLabelByLang";
import axios from "../services/api";
import "../styles/BookingsPage.css";
import CustomDropdown  from "../componenets/CustomDropdown";
import {
  isValidPhoneNumber,
  isValidCustomerName,
  isDateTimeInFuture,
  isTimeWithinWorkingHours,
} from "../utils/bookingValidation";
import { toast } from "react-toastify";

const BookingsPage = () => {
  const ownerData = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  const { language } = useContext(LanguageContext);
  const businessId = ownerData?.businessId;
  const [businessConfig, setBusinessConfig] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [loading, setLoading] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
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
      setBusinessConfig(res.data.config?.booking); // contains openingTime, closingTime
    } catch (err) {
      console.error("❌ Failed to fetch business config:", err.message);
    }
  }, [businessId]);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/bookings/${businessId}`);
      setBookings(res.data);
    } catch (err) {
      console.error("❌ Failed to load bookings:", err.message);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  const fetchServices = useCallback(async () => {
    try {
      const res = await axios.get("/services", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setServices(res.data.filter((s) => s.isActive));
    } catch (err) {
      console.error("❌ Failed to load services:", err.message);
    }
  }
, [token]);

  useEffect(() => {
    if (businessId) {
      fetchBookings();
      fetchServices();
      fetchBusinessConfig();
    }
  }, [businessId, fetchBookings, fetchServices,fetchBusinessConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, dateFilter, searchQuery]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleOutsideClickOrScroll = (event) => {
      // Prevent crash by checking if target is a DOM element
      if (
        !(event.target instanceof Element) ||
        !event.target.closest(".dropdown-wrapper")
      ) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener("click", handleOutsideClickOrScroll);
    document.addEventListener("scroll", handleOutsideClickOrScroll, true); // useCapture = true for better scroll detection

    return () => {
      document.removeEventListener("click", handleOutsideClickOrScroll);
      document.removeEventListener("scroll", handleOutsideClickOrScroll, true);
    };
  }, []);

  

  const handleResetDateFilter = () => {
    setDateFilter("");
    setStatusFilter("all");
    setSearchQuery("");
  };

  const toggleDropdown = (id) => {
    setOpenDropdownId(prev => (prev === id ? null : id));
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      await axios.put(`/bookings/update-status/${bookingId}`, { status: newStatus });
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? { ...b, status: newStatus } : b))
      );
    } catch (err) {
      console.error("❌ Failed to update status:", err.message);
    }
  };


  const handleEditClick = (booking) => {
    setFormData({
      ...booking,
      service: typeof booking.service === "object" ? JSON.stringify(booking.service) : booking.service
    });
    setEditingId(booking._id);
    setShowForm(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

  const { customerName, phoneNumber, date, time } = formData;

  const config = {
    openingTime: businessConfig?.openingTime, // You should replace this with a value from DB
    closingTime: businessConfig?.closingTime,
  };

  let IsValid = true;   

  // 🛑 Validate name
  if (!isValidCustomerName(customerName)) {
    IsValid = false;
    toast.error(getLabelByLang(translations.bookingsPage.toastNotValidcustomerName, language));
  }

  // 🛑 Validate phone number
  if (!isValidPhoneNumber(phoneNumber)) {
    IsValid = false;
    toast.error(getLabelByLang(translations.bookingsPage.toastNotValidPhone, language));
  }

  // 🛑 Validate date + time
  if (!isDateTimeInFuture(date, time)) {
    IsValid = false;
    toast.error(getLabelByLang(translations.bookingsPage.toastNotValidDate, language));
  }


  // 🛑 Validate working hours
  if (!isTimeWithinWorkingHours(time, config.openingTime, config.closingTime)) {
    IsValid = false;
    toast.error(
      getLabelByLang(translations.bookingsPage.toastNotValidTime, language)
      .replace("{openingTime}", config.openingTime )
      .replace("{closingTime}", config.closingTime)
      );
  }
    if(!IsValid)
     return;

    try {
      const serviceObj = JSON.parse(formData.service); // parse it back to object
  
      const payload = {
        ...formData,
        service: serviceObj,
        businessId
      };
  
      if (editingId) {
        await axios.put(`/bookings/${editingId}`, payload);
      } else {
        await axios.post("/bookings", payload);
      }
  
      // reset
      setFormData({
        customerName: "",
        phoneNumber: "",
        service: "",
        date: "",
        time: "",
        status: "pending",
      });
      setEditingId(null);
      setShowForm(false);
      fetchBookings();
    } catch (err) {
      console.error("❌ Failed to submit booking:", err.message);
    }
  };

  const handleDelete = async (bookingId) => {
    if (!window.confirm("Are you sure you want to delete this booking?")) return;
    try {
      await axios.delete(`/bookings/${bookingId}`);
      setBookings(bookings.filter((b) => b._id !== bookingId));
    } catch (err) {
      console.error("❌ Failed to delete booking:", err.message);
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter(b =>
      (statusFilter === "all" || b.status === statusFilter) &&
      (dateFilter === "" || b.date === dateFilter) &&
      (
        b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.phoneNumber.includes(searchQuery)
      )
    );
  }, [bookings, statusFilter, dateFilter, searchQuery]);

  const bookingsPerPage =10;
  const indexOfLastBooking = currentPage * bookingsPerPage;
  const indexOfFirstBooking = indexOfLastBooking - bookingsPerPage;
  const currentBookings = filteredBookings.slice(indexOfFirstBooking, indexOfLastBooking);
  const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage);

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);
  const statusOptions = [
    { value: "all", label: getLabelByLang(translations.bookingsPage.all, language) },
    { value: "pending", label: getLabelByLang(translations.bookingsPage.pending, language) },
    { value: "confirmed", label: getLabelByLang(translations.bookingsPage.confirmed, language) },
    { value: "cancelled", label: getLabelByLang(translations.bookingsPage.cancelled, language) },
  ];
  
  
<CustomDropdown
  options={statusOptions}
  value={statusFilter}
  onChange={setStatusFilter}
  placeholder="Select status"
  isRtl={["ar", "he"].includes(language)}
/>

  
  if (!businessId) return <p>❌ No business ID found. Please log in again.</p>;

  return (
    <div className={`bookings-container ${["ar", "he"].includes(language) ? "rtl" : "ltr"}`}>

      <div className="search-byName-Number">
        <label>
          {getLabelByLang(translations.bookingsPage.searchLabel, language)}:
        </label>
        <input
          type="text"
          placeholder={getLabelByLang(translations.bookingsPage.searchPlaceholder, language)}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="filters">
        <label>
          {getLabelByLang(translations.bookingsPage.filterLabel, language)}:
        </label>
 
        <CustomDropdown
          options={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder={getLabelByLang(translations.bookingsPage.selectStatus, language) || "Select status"}
          isRtl={["ar", "he"].includes(language)}
        />

        <div className="date-filter">
          <label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </label>
          <button className="reset-date-btn" onClick={handleResetDateFilter}>
            ♻️
          </button>
        </div>
      </div>


      {showForm && (
        <form onSubmit={handleFormSubmit} className="booking-form">
          <input
            type="text"
            placeholder={getLabelByLang(translations.bookingsPage.customerNamePlaceholder, language)}
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            required
          />
          <input
            type="tel"
            placeholder={getLabelByLang(translations.bookingsPage.phonePlaceholder, language)}
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            required
          />
          <CustomDropdown
            options={[
              { value: "", label: getLabelByLang(translations.bookingsPage.selectService, language) },
                ...services.map(s => ({
                  value: JSON.stringify(s.name),
                  label: s.name?.[language] || s.name?.en
              }))
            ]}
            value={formData.service}
            onChange={(val) => setFormData({ ...formData, service: val })}
            placeholder={getLabelByLang(translations.bookingsPage.selectService, language)}
            isRtl={["ar", "he"].includes(language)}  // example: language variable from your app


          />

          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
          <input
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            required
          />
          <CustomDropdown
            value={formData.status}
            onChange={(val) => setFormData({ ...formData, status: val })}
            options={[
              { value: "pending", label: getLabelByLang(translations.bookingsPage.pending, language) },
              { value: "confirmed", label: getLabelByLang(translations.bookingsPage.confirmed, language) },
              { value: "cancelled", label: getLabelByLang(translations.bookingsPage.cancelled, language) }
            ]}
            isRtl={["ar", "he"].includes(language)}  // example: language variable from your app
          />

          <button
            className="SaveBooking-btn"
            disabled={
              !formData.customerName || !formData.phoneNumber || !formData.date || !formData.time
            }
          >
            ✅ {getLabelByLang(translations.bookingsPage.save, language)}
          </button>
        </form>
      )}
      <button className={showForm ? "add-new-booking-btn cancel-mode" : "add-new-booking-btn"}
        onClick={() => setShowForm(!showForm)}
      >
        {showForm
          ? getLabelByLang(translations.bookingsPage.cancel, language)
          : getLabelByLang(translations.bookingsPage.addBooking, language)}
      </button>


      {loading ? (
        <p>{getLabelByLang(translations.bookingsPage.loadingBookings, language)}</p>
      ) : filteredBookings.length === 0 ? (
        <p>{getLabelByLang(translations.bookingsPage.noBookings, language)}</p>
      ) : isMobile ? (
        <div className="mobile-bookings">
          {currentBookings.map((b) => (
            <div key={b._id} className="mobile-booking-card">
              <div className="mobile-booking-header">
                <div className="dropdown-wrapper">
                  <button className="dots-button" onClick={() => toggleDropdown(b._id)}>⋮</button>
                  {openDropdownId === b._id && (
                    <div className="dropdown-menu-actions-booking">
                      {b.status === "pending" && (
                        <>
                          <button onClick={() => handleStatusChange(b._id, "confirmed")}>✅ {getLabelByLang(translations.bookingsPage.confirm, language)}</button>
                          <button onClick={() => handleStatusChange(b._id, "cancelled")}>✖️ {getLabelByLang(translations.bookingsPage.cancel, language)}</button>
                        </>
                      )}
                      <button onClick={() => handleEditClick(b)}>{getLabelByLang(translations.bookingsPage.edit, language)} &nbsp; ✏️  </button>
                      <button onClick={() => handleDelete(b._id)}>{getLabelByLang(translations.bookingsPage.delete, language)} &nbsp; 🗑️ </button>
                    </div>
                  )}
                </div>
                <p><strong>{getLabelByLang(translations.bookingsPage.customerNamePlaceholder, language)}:</strong> {b.customerName}</p>
              </div>
              <p><strong>{getLabelByLang(translations.bookingsPage.servicePlaceholder, language)}:</strong> {b.service?.[language] || b.service?.en || "-"}</p>
              <p><strong>{getLabelByLang(translations.bookingsPage.dateTime, language)}:</strong> {b.date} <strong>{b.time}</strong></p>
              <p><strong>{getLabelByLang(translations.bookingsPage.status, language)}:</strong> {getLabelByLang(translations.bookingsPage[b.status], language)}</p>


            </div>
          ))}
        </div>
      ) : (
      <table className="bookings-table">
        <thead>
          <tr>
            <th>{getLabelByLang(translations.bookingsPage.customerNamePlaceholder, language)}</th>
            <th>{getLabelByLang(translations.bookingsPage.phonePlaceholder, language)}</th>
            <th>{getLabelByLang(translations.bookingsPage.servicePlaceholder, language)}</th>
            <th>{getLabelByLang(translations.bookingsPage.date, language)}</th>
            <th>{getLabelByLang(translations.bookingsPage.time, language)}</th>
            <th>{getLabelByLang(translations.bookingsPage.status, language)}</th>
          </tr>
        </thead>
        <tbody>
          {currentBookings.map((b) => (
            <tr key={b._id}>
              <td>{b.customerName}</td>
              <td>{b.phoneNumber}</td>
              <td>{b.service?.[language] || b.service?.en || "-"}</td>
              <td>{b.date}</td>
              <td>{b.time}</td>
              <td>
                <strong>{getLabelByLang(translations.bookingsPage[b.status], language)}</strong>
                <div className="actions">
                  {b.status === "pending" && (
                    <>
                      <button onClick={() => handleStatusChange(b._id, "confirmed")}>✅</button>
                      <button onClick={() => handleStatusChange(b._id, "cancelled")}>✖️</button>
                    </>
                  )}
                  <button onClick={() => handleEditClick(b)}>✏️</button>
                  <button onClick={() => handleDelete(b._id)}>🗑️</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
      <div className="pagination-container">
        <div className="pagination-summary">
          {bookings.length > 0 && (
            <span>
              {getLabelByLang(translations.bookingsPage.paginationSummary, language)
                .replace("{from}", filteredBookings.length === 0 ? 0 : indexOfFirstBooking + 1)
                .replace("{to}", Math.min(indexOfLastBooking, filteredBookings.length))
                .replace("{total}", filteredBookings.length)}
            </span>
          )}
        </div>
        <div className="pagination">
          {currentPage > 1 && <button onClick={() => handlePageChange(currentPage - 1)} className="circle-button">&lt;</button>}
          <button onClick={() => handlePageChange(1)} className={`circle-button ${currentPage === 1 ? 'active-page' : ''}`}>1</button>
          {currentPage !== 1 && currentPage !== totalPages && <button className="circle-button active-page">{currentPage}</button>}
          {totalPages > 1 && <button onClick={() => handlePageChange(totalPages)} className={`circle-button ${currentPage === totalPages ? 'active-page' : ''}`}>{totalPages}</button>}
          {currentPage < totalPages && <button onClick={() => handlePageChange(currentPage + 1)} className="circle-button">&gt;</button>}
        </div>
      </div>
      
    </div>
  );
};

export default BookingsPage;
