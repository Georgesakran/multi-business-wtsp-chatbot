import { useEffect, useState } from 'react';
import axios from 'axios';

function BookingsPage({ businessId }) {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    axios.get(`/api/bookings/${businessId}`)
      .then(res => setBookings(res.data))
      .catch(err => console.error(err));
  }, [businessId]);

  return (
    <div>
      <h2>📅 قائمة الحجوزات</h2>
      <table>
        <thead>
          <tr>
            <th>📱 رقم العميل</th>
            <th>💅 الخدمة</th>
            <th>📅 التاريخ</th>
            <th>⏰ الساعة</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b, i) => (
            <tr key={i}>
              <td>{b.phoneNumber}</td>
              <td>{b.service}</td>
              <td>{b.date}</td>
              <td>{b.hour}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BookingsPage;