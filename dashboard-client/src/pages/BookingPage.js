import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "../services/api";
import "../styles/BookingsPage.css";

const BookingsPage = () => {
  const ownerData = JSON.parse(localStorage.getItem("user"));
  const businessId = ownerData?.businessId;
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [loading, setLoading] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [bookings, setBookings] = useState([]);
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

  useEffect(() => {
    if (businessId) fetchBookings();
  }, [businessId, fetchBookings]);

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
    setFormData({ ...booking });
    setEditingId(booking._id);
    setShowForm(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`/bookings/${editingId}`, { ...formData, businessId });
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

  const bookingsPerPage = 5;
  const indexOfLastBooking = currentPage * bookingsPerPage;
  const indexOfFirstBooking = indexOfLastBooking - bookingsPerPage;
  const currentBookings = filteredBookings.slice(indexOfFirstBooking, indexOfLastBooking);
  const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage);

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  if (!businessId) return <p>❌ No business ID found. Please log in again.</p>;

  return (
    <div className="bookings-container">
      <label>
        Search Bookings :
      </label>
      <input type="text" placeholder="🔎 Search by name or phone" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      <div className="filters">
        <label>
          Filter :
          </label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        
        <div className="date-filter">
        <label>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        </label>
        <button className="reset-date-btn" onClick={handleResetDateFilter}>
          ♻️
        </button>
        </div>
        

      </div>
      <button
        className={showForm ? "add-new-booking-btn cancel-mode" : "add-new-booking-btn"}
        onClick={() => setShowForm(!showForm)}
      >
        {showForm ? "Cancel" : "➕ Add Booking"}
      </button>
      {showForm && (
        <form onSubmit={handleFormSubmit} className="booking-form">
          <input type="text" placeholder="Customer Name" value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} required />
          <input type="tel" placeholder="Phone" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} required />
          <input type="text" placeholder="Service" value={formData.service} onChange={(e) => setFormData({ ...formData, service: e.target.value })} required />
          <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
          <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} required />
          <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className="SaveBooking-btn" disabled={!formData.customerName || !formData.phoneNumber || !formData.date || !formData.time}>✅ Save Booking</button>
        </form>
      )}

      {loading ? (
        <p>Loading bookings...</p>
      ) : bookings.length === 0 ? (
        <p>No bookings yet.</p>
      ) : isMobile ? (
        <div className="mobile-bookings">
          {currentBookings.map((b) => (
            <div key={b._id} className="mobile-booking-card">
              <p><strong>Name:</strong> {b.customerName}</p>
              <p><strong>Service:</strong> {b.service}</p>
              <p><strong>Date & Time:</strong> {b.date} {b.time}</p>
              <p><strong>Status:</strong> {b.status}</p>
              <div className="dropdown-wrapper">
                <button className="dots-button" onClick={() => toggleDropdown(b._id)}>⋮</button>
                {openDropdownId === b._id && (
                  <div className="dropdown-menu">
                    {b.status === "pending" && (
                      <>
                        <button onClick={() => handleStatusChange(b._id, "confirmed")}>✅ Confirm</button>
                        <button onClick={() => handleStatusChange(b._id, "cancelled")}>❌ Cancel</button>
                      </>
                    )}
                    <button onClick={() => handleEditClick(b)}>✏️ Edit</button>
                    <button onClick={() => handleDelete(b._id)}>🗑️ Delete</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <table className="bookings-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>Service</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {currentBookings.map((b) => (
              <tr key={b._id}>
                <td>{b.customerName}</td>
                <td>{b.phoneNumber}</td>
                <td>{b.service}</td>
                <td>{b.date}</td>
                <td>{b.time}</td>
                <td>
                  <strong>{b.status}</strong>
                  <div className="actions">
                    {b.status === "pending" && (
                      <>
                        <button onClick={() => handleStatusChange(b._id, "confirmed")}>✅</button>
                        <button onClick={() => handleStatusChange(b._id, "cancelled")}>❌</button>
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
              Showing {filteredBookings.length === 0 ? 0 : indexOfFirstBooking + 1} to {Math.min(indexOfLastBooking, filteredBookings.length)} of {filteredBookings.length} entries
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
