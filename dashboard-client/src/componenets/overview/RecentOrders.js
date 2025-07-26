import React from "react";
// import "./RecentOrders.css";

const RecentOrders = ({ ordersByDate = {} }) => {
  const dates = Object.keys(ordersByDate).sort((a, b) => new Date(b) - new Date(a));

  if (dates.length === 0) return null;

  return (
    <div className="recent-orders">
      <h3>🛒 Orders (Last 5 Days)</h3>
      {dates.map((date) => (
        <div key={date} className="orders-group">
          <div className="order-date">{new Date(date).toDateString()}</div>
          {ordersByDate[date].map((order, i) => (
            <div key={i} className="order-item">
              <strong>{order.customerName}</strong> • {order.products?.length || 0} items • ₪{order.total}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default RecentOrders;