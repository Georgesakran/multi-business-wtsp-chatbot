import React, { useEffect, useState, useCallback } from "react";
import axios from "../services/api";
import "../styles/BookingsPage.css";

const BookingsPage = () => {
  const ownerData = JSON.parse(localStorage.getItem("user")); // or whatever key you used
  const businessId = ownerData?.businessId;
  const [currentPage, setCurrentPage] = useState(1);
  
  const [bookings, setBookings] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    return today.toLocaleDateString("en-CA"); // avoids timezone shift
  }); 
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
    try {
      const res = await axios.get(`/bookings/${businessId}`);
      setBookings(res.data);
    } catch (err) {
      console.error("❌ Failed to load bookings:", err.message);
    }
  }, [businessId]);

  useEffect(() => {
    if (businessId) fetchBookings();
  }, [businessId, fetchBookings]);


  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      await axios.put(`/bookings/update-status/${bookingId}`, { status: newStatus });
      setBookings((prev) =>
        prev.map((b) =>
          b._id === bookingId ? { ...b, status: newStatus } : b
        )
      );
    } catch (err) {
      console.error("❌ Failed to update status:", err.message);
    }
  };

  const handleEditClick = (booking) => {
    setFormData({
      customerName: booking.customerName,
      phoneNumber: booking.phoneNumber,
      service: booking.service,
      date: booking.date,
      time: booking.time,
      status: booking.status,
    });
    setEditingId(booking._id);
    setShowForm(true);
  };
  
  const handleFormSubmit = async (e) => {
    e.preventDefault();
  
    try {
      if (editingId) {
        await axios.put(`/bookings/${editingId}`, {
          ...formData,
          businessId,
        });
      } else {
        await axios.post("/bookings", {
          ...formData,
          businessId,
        });
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
  }

  const filteredBookings = bookings.filter(b =>
    (statusFilter === "all" || b.status === statusFilter) &&
    (dateFilter === "" || b.date === dateFilter) &&
    (
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.phoneNumber.includes(searchQuery)
    )
  );

  const bookingsPerPage = 5;
const indexOfLastBooking = currentPage * bookingsPerPage;
const indexOfFirstBooking = indexOfLastBooking - bookingsPerPage;
const currentBookings = filteredBookings.slice(indexOfFirstBooking, indexOfLastBooking);
const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };


  if (!businessId) {
    return <p>❌ No business ID found. Please log in again.</p>;
  }
  return (
    <div className="bookings-container">
      <h2>📅 Your Bookings</h2>
      <input
        type="text"
        placeholder="🔎 Search by name or phone"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <div className="filters">
        <label>
          Status:
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label>
          Date:
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </label>
      </div>
      <button onClick={() => setShowForm(!showForm)}>
        {showForm ? "Cancel" : "➕ Add Booking"}
      </button>
      {showForm && (
        <form onSubmit={handleFormSubmit} className="booking-form">
          <input
            type="text"
            placeholder="Customer Name"
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            required
          />
          <input
            type="tel"
            placeholder="Phone"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Service"
            value={formData.service}
            onChange={(e) => setFormData({ ...formData, service: e.target.value })}
            required
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
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button type="submit" disabled={!formData.customerName || !formData.phoneNumber || !formData.date || !formData.time}>
            ✅ Save Booking
          </button>
        </form>
      )}

      {bookings.length === 0 ? (
        <p>No bookings yet.</p>
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
              Showing {filteredBookings.length === 0 ? 0 : indexOfFirstBooking + 1} to{" "}
              {Math.min(indexOfLastBooking, filteredBookings.length)} of {filteredBookings.length} entries
            </span>
          )}
        </div>

        <div className="pagination">
          {currentPage > 1 && (
            <button onClick={() => handlePageChange(currentPage - 1)} className="circle-button">&lt;</button>
          )}

          <button
            onClick={() => handlePageChange(1)}
            className={`circle-button ${currentPage === 1 ? 'active-page' : ''}`}
          >
            1
          </button>

          {currentPage !== 1 && currentPage !== totalPages && (
            <button className="circle-button active-page">{currentPage}</button>
          )}

          {totalPages > 1 && (
            <button
              onClick={() => handlePageChange(totalPages)}
              className={`circle-button ${currentPage === totalPages ? 'active-page' : ''}`}
            >
              {totalPages}
            </button>
          )}

          {currentPage < totalPages && (
            <button onClick={() => handlePageChange(currentPage + 1)} className="circle-button">&gt;</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingsPage;