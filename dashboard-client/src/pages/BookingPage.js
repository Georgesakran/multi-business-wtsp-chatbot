import React, { useEffect, useState, useCallback } from "react";
import axios from "../services/api";
import "../styles/BookingsPage.css";

const BookingsPage = () => {
  const businessId = JSON.parse(localStorage.getItem("business"))?.businessId;
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
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
    } finally {
      setLoading(true);
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
  const handleAddBooking = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/bookings", {
        ...formData,
        businessId,
      });
  
      setFormData({
        customerName: "",
        customerPhone: "",
        service: "",
        date: "",
        time: "",
        status: "pending",
      });
      setShowForm(false);
      fetchBookings(); // reload bookings
    } catch (err) {
      console.error("❌ Failed to add booking:", err.message);
    }
  };


  if (loading) return <p>⏳ Loading bookings...</p>;
  return (
    <div className="bookings-container">
      <h2>📅 Your Bookings</h2>
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
        <form onSubmit={handleAddBooking} className="booking-form">
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
            value={formData.customerPhone}
            onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
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

          <button type="submit">✅ Save Booking</button>
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
            {bookings
            .filter((b) =>
              (statusFilter === "all" || b.status === statusFilter) &&
              (dateFilter === "" || b.date === dateFilter)
            )
            .map((b) => (
              <tr key={b._id}>
                <td>{b.customerName}</td>
                <td>{b.phoneNumber}</td>
                <td>{b.service}</td>
                <td>{b.date}</td>
                <td>{b.time}</td>
                <td>
                  <strong>{b.status}</strong>
                  {b.status === "pending" && (
                    <>
                      <button onClick={() => handleStatusChange(b._id, "confirmed")}>✅</button>
                      <button onClick={() => handleStatusChange(b._id, "cancelled")}>❌</button>
                    </>
                  )}
                </td>              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default BookingsPage;