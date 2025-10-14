// src/componenets/orders/OrdersTable.js
import React, { useMemo, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

export default function OrdersTable({ orders, onEdit, onDelete }) {
  const [openIdx, setOpenIdx] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const btnRefs = useRef({});
  const navigate = useNavigate();

  const fmt = useMemo(() => new Intl.NumberFormat("he-IL", { style:"currency", currency:"ILS", maximumFractionDigits:0 }), []);

  const openMenuFor = (i) => {
    if (openIdx === i) { setOpenIdx(null); return; }
    setOpenIdx(i);
    const r = btnRefs.current[i]?.getBoundingClientRect();
    if (r) setMenuPos({ top: r.bottom, right: window.innerWidth - r.right });
  };

  const closeMenu = () => setOpenIdx(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (openIdx === null) return;
      const btn = btnRefs.current[openIdx];
      if (btn && (btn === e.target || btn.contains(e.target))) return;
      closeMenu();
    };
    const onKey = (e) => e.key === "Escape" && closeMenu();
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openIdx]);

  useEffect(() => {
    if (openIdx === null) return;
    const handleResize = () => {
      const r = btnRefs.current[openIdx]?.getBoundingClientRect();
      if (!r) return setOpenIdx(null);
      setMenuPos({ top: r.bottom, right: window.innerWidth - r.right });
    };
    const handleScroll = () => closeMenu();
    window.addEventListener("resize", handleResize, { passive:true });
    window.addEventListener("orientationchange", handleResize, { passive:true });
    window.addEventListener("scroll", handleScroll, { passive:true });
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [openIdx]);

  return (
    <div className="products-courses-table-wrapper">
      <table className="products-courses-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Date</th>
            <th className="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {!orders || orders.length === 0 ? (
            <tr><td colSpan="7" className="no-data">No orders found</td></tr>
          ) : orders.map((o, i) => (
            <tr key={o._id || i}>
              <td data-label="#">{o.number || o._id.slice(-6)}</td>
              <td data-label="Customer">{o.customer?.name || "—"}</td>
              <td data-label="Total">{fmt.format(o.totals?.total || 0)}</td>
              <td data-label="Status"><span className={`status-badge ${o.status}`}>{o.status}</span></td>
              <td data-label="Payment"><span className={`status-badge ${o.paymentStatus}`}>{o.paymentStatus}</span></td>
              <td data-label="Date">{new Date(o.createdAt).toLocaleDateString()}</td>
              <td className="actions-cell" data-label="Actions">
                <button
                  className="dots-btn"
                  ref={el => btnRefs.current[i] = el}
                  onClick={() => openMenuFor(i)}
                  aria-haspopup="menu"
                  aria-expanded={openIdx===i}
                >⋮</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {openIdx !== null && createPortal(
        <div
          className="dropdown-menu"
          role="menu"
          style={{ position:"fixed", top: `${menuPos.top}px`, right: `${menuPos.right}px` }}
          onMouseDown={(e)=> e.stopPropagation()}
        >
          <button
            role="menuitem"
            onClick={() => { navigate(`/owner/orders/${orders[openIdx]._id}`); closeMenu(); }}
          >👁 View</button>

          <button
            role="menuitem"
            onClick={() => { onEdit?.(orders[openIdx]); closeMenu();}}
          >✏️ Edit</button>

          <button
            role="menuitem"
            onClick={() => { onDelete?.(orders[openIdx]._id); closeMenu(); }}
          >🗑 Delete</button>

          <button role="menuitem" className="close-btn" onClick={()=>closeMenu()}>❌ Close</button>
        </div>,
        document.body
      )}
    </div>
  );
}