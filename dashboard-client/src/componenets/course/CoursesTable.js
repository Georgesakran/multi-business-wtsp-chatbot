// components/course/CoursesTable.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./CoursesTable.css";

const CoursesTable = ({ courses, onView, onEdit, onDelete }) => {
  const [openIdx, setOpenIdx] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const btnRefs = useRef({});

  const fmtPrice = useMemo(
    () =>
      new Intl.NumberFormat("he-IL", {
        style: "currency",
        currency: "ILS",
        maximumFractionDigits: 0,
      }),
    []
  );

  const closeMenu = () => setOpenIdx(null);

  const openMenuFor = (index) => {
    // toggle off if same
    if (openIdx === index) return closeMenu();

    setOpenIdx(index);
    // compute position based on button viewport rect
    const btn = btnRefs.current[index];
    if (btn) {
      const r = btn.getBoundingClientRect();
      setMenuPos({
        top: r.bottom,                          // px from top of viewport
        right: window.innerWidth - r.right,     // px from right edge
      });
    }
  };

  // click outside + ESC
  useEffect(() => {
    const onDocClick = (e) => {
      if (openIdx === null) return;
      const btn = btnRefs.current[openIdx];
      if (btn && (btn === e.target || btn.contains(e.target))) return; // click on the same button
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

  // keep menu aligned on resize/orientation, close on scroll (simplest UX)
  useEffect(() => {
    if (openIdx === null) return;
    const handleResize = () => {
      const btn = btnRefs.current[openIdx];
      if (!btn) return closeMenu();
      const r = btn.getBoundingClientRect();
      setMenuPos({ top: r.bottom, right: window.innerWidth - r.right });
    };
    const handleScroll = () => closeMenu();

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("orientationchange", handleResize, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
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
            <th>Title</th>
            <th>Instructor</th>
            <th>Price</th>
            <th>Days</th>
            <th>Max Participants</th>
            <th aria-label="Actions" className="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {!courses || courses.length === 0 ? (
            <tr>
              <td colSpan="6" className="no-data">No courses found</td>
            </tr>
          ) : (
            courses.map((course, i) => (
              <tr key={course._id || i}>
                <td data-label="Title" className="cell-title">{course.title}</td>
                <td data-label="Instructor">{course.instructor || "—"}</td>
                <td data-label="Price">{fmtPrice.format(course.price || 0)}</td>
                <td data-label="Days">{course.sessions?.length || 0}</td>
                <td data-label="Max Participants">{course.maxParticipants ?? "—"}</td>
                <td className="actions-cell" data-label="Actions">
                  <button
                    className="dots-btn"
                    ref={(el) => (btnRefs.current[i] = el)}
                    onClick={() => openMenuFor(i)}
                    aria-haspopup="menu"
                    aria-expanded={openIdx === i}
                    title="Actions"
                  >
                    ⋮
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Portal menu outside the table so it never affects row height */}
      {openIdx !== null &&
  createPortal(
    <div
      className="dropdown-menu"
      role="menu"
      style={{
        position: "fixed",
        top: `${menuPos.top}px`,
        right: `${menuPos.right}px`,
      }}
      onMouseDown={(e) => e.stopPropagation()}   // 👈 prevent outside click handler
    >
      <button
        role="menuitem"
        onClick={() => { onView(courses[openIdx]); closeMenu(); }}
      >👁 View</button>

      <button
        role="menuitem"
        onClick={() => { onEdit(courses[openIdx]); closeMenu(); }}
      >✏️ Edit</button>

      <button
        role="menuitem"
        onClick={() => { onDelete(courses[openIdx]._id); closeMenu(); }}
      >🗑 Delete</button>

      <button role="menuitem" className="close-btn" onClick={closeMenu}>❌ Close</button>
    </div>,
    document.body
  )}

    </div>
  );
};

export default CoursesTable;