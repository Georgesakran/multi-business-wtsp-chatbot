import React, { useMemo } from "react";
import "./CourseViewModal.css";

// -------- Helpers --------
const toLocalDate = (dateStr, timeStr = "00:00") => {
  if (!dateStr) return new Date(NaN);
  const t = timeStr || "00:00";
  return new Date(`${dateStr}T${t}`);
};

const isSameCalendarDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const getStatus = (s, now) => {
  // Hard overrides first (if you persist later)
  if (s.cancelled) return { key: "cancelled", label: "Cancelled" };
  if (s.isCompleted) return { key: "done", label: "Done" };

  const start = toLocalDate(s.date, s.startTime || "00:00");
  const end = toLocalDate(s.date, s.endTime || s.startTime || "00:00");

  const rescheduled =
    (s.originalDate && s.originalDate !== s.date) ||
    (s.originalStartTime && s.originalStartTime !== s.startTime) ||
    (s.originalEndTime && s.originalEndTime !== s.endTime);

  if (!isFinite(start) || !isFinite(end)) return { key: "upcoming", label: "Upcoming" };

  if (now > end) return { key: "done", label: "Done" };
  if (now >= start && now <= end) return { key: "live", label: "In progress" };
  if (isSameCalendarDay(start, now) && now < start) return { key: "today", label: "Today" };
  if (rescheduled) return { key: "rescheduled", label: "Rescheduled" };

  return { key: "upcoming", label: "Upcoming" };
};

const formatMoney = (n) => {
  const num = Number(n);
  return Number.isFinite(num) ? num.toLocaleString() : n ?? "—";
};

const safeTime = (t) => (t ? t : "—");

// -------- Component --------
const CourseViewModal = ({ course, onClose }) => {
  // Hooks must be un-conditional
  const now = useMemo(() => new Date(), []);

  // Sort sessions (stable)
  const sortedSessions = useMemo(() => {
    if (!course || !Array.isArray(course.sessions)) return [];
    return course.sessions
      .map((s, idx) => ({ ...s, _idx: idx }))
      .sort(
        (a, b) =>
          toLocalDate(a.date, a.startTime) - toLocalDate(b.date, b.startTime)
      );
  }, [course]);

  // Enrich with status + wasRescheduled, and compute "next" index
  const enriched = useMemo(() => {
    const list = sortedSessions.map((s) => {
      const status = getStatus(s, now);
      const wasRescheduled =
        (s.originalDate && s.originalDate !== s.date) ||
        (s.originalStartTime && s.originalStartTime !== s.startTime) ||
        (s.originalEndTime && s.originalEndTime !== s.endTime);
      return { ...s, status, wasRescheduled };
    });

    // find first session not finished yet
    let nextIdx = -1;
    for (let i = 0; i < list.length; i++) {
      const end = toLocalDate(list[i].date, list[i].endTime || list[i].startTime || "00:00");
      if (now <= end) { nextIdx = i; break; }
    }
    return { list, nextIdx };
  }, [sortedSessions, now]);

  // Summary counts for the bar
  const statusCounts = useMemo(() => {
    const counts = { done: 0, live: 0, today: 0, upcoming: 0, rescheduled: 0, cancelled: 0 };
    for (const s of enriched.list) {
      const k = s.status.key;
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }, [enriched.list]);

  // safe early-return AFTER hooks
  if (!course) return null;

  return (
    <div
      className="course-view-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="course-view-title"
    >
      <div className="course-view-container">
        <div className="course-view-header">
          <h3 id="course-view-title">📄 {course.title}</h3>
          <button
            onClick={onClose}
            className="close-view-btn"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="course-view-content">
          <p><strong>👨‍🏫 Instructor:</strong> {course.instructor || "—"}</p>
          <p><strong>💰 Price:</strong> {formatMoney(course.price)} ₪</p>
          <p><strong>👥 Max Participants:</strong> {course.maxParticipants ?? "—"}</p>
          <p><strong>📝 Description:</strong> {course.description || "—"}</p>

          <h4>📆 Sessions</h4>

          {/* Summary bar */}
          {enriched.list.length > 0 && (
            <div className="status-summary">
            📊 Summary:&nbsp;

            {statusCounts.done > 0 && (
              <span className="summary-pill done">{statusCounts.done} Done</span>
            )}
            {statusCounts.live > 0 && (
              <span className="summary-pill live">{statusCounts.live} In progress</span>
            )}
            {statusCounts.today > 0 && (
              <span className="summary-pill today">{statusCounts.today} Today</span>
            )}
            {statusCounts.upcoming > 0 && (
              <span className="summary-pill upcoming">{statusCounts.upcoming} Upcoming</span>
            )}
            {statusCounts.rescheduled > 0 && (
              <span className="summary-pill rescheduled">{statusCounts.rescheduled} Rescheduled</span>
            )}
            {statusCounts.cancelled > 0 && (
              <span className="summary-pill cancelled">{statusCounts.cancelled} Cancelled</span>
            )}
          </div>
          
          )}

          {/* Sessions list */}
          {enriched.list.length > 0 ? (
            <ul className="session-list">
              {enriched.list.map((s, i) => (
                <li
                  key={`${s.date}-${s.startTime}-${i}`}
                  className={i === enriched.nextIdx ? "is-next" : undefined}
                >
                  <div className="session-left">
                    <span className="session-index">Session {s._idx + 1}:</span>
                    <span className="session-date">{s.date || "—"}</span>
                    <span className="session-time">
                      {safeTime(s.startTime)} – {safeTime(s.endTime)}
                    </span>
                  </div>

                  <div className="session-right">
                    <span className={`status-pill ${s.status.key}`}>{s.status.label}</span>
                    {s.wasRescheduled && (
                      <span className="resched-note" title="Original time">
                        (was {s.originalDate || s.date} {s.originalStartTime || s.startTime}
                        {s.originalEndTime ? `–${s.originalEndTime}` : ""})
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>No sessions defined.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseViewModal;