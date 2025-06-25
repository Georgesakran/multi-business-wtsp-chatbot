import React, { useEffect, useState } from "react";
import axios from "../services/api";
import "../styles/BookingsPage.css";

const BookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const businessId = JSON.parse(localStorage.getItem("business"))?.businessId;

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await axios.get(`/bookings/${businessId}`);
        setBookings(res.data);
      } catch (err) {
        console.error("❌ Failed to load bookings:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [businessId]);

  if (loading) return <p>⏳ Loading bookings...</p>;

  return (
    <div className="bookings-container">
      <h2>📅 Your Bookings</h2>
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
            {bookings.map((b) => (
              <tr key={b._id}>
                <td>{b.customerName}</td>
                <td>{b.phoneNumber}</td>
                <td>{b.service}</td>
                <td>{b.date}</td>
                <td>{b.time}</td>
                <td>{b.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default BookingsPage;