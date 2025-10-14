import React, { useEffect, useMemo, useRef, useState } from "react";
import "./CourseFormModal.css";
import api from "../../services/api";
import { toast } from "react-toastify";

const defaultSession = { date: "", startTime: "", endTime: "" };

const CourseFormModal = ({
  businessId,
  onClose,
  onCourseAdded,
  existingCourse,
}) => {
  const [title, setTitle] = useState("");
  const [instructor, setInstructor] = useState("");
  const [price, setPrice] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [description, setDescription] = useState("");
  const [sessions, setSessions] = useState([ { ...defaultSession } ]);

  // simple client-side validation state
  const [errors, setErrors] = useState({});

  // focus trap anchors
  const modalRef = useRef(null);
  const firstFocusableRef = useRef(null);
  const lastFocusableRef = useRef(null);

  // hydrate on edit
  useEffect(() => {
    if (existingCourse) {
      setTitle(existingCourse.title || "");
      setInstructor(existingCourse.instructor || "");
      setPrice(existingCourse.price ?? "");
      setMaxParticipants(existingCourse.maxParticipants ?? "");
      setDescription(existingCourse.description || "");
      setSessions(
        existingCourse.sessions?.length
          ? existingCourse.sessions.map(s => ({ ...defaultSession, ...s }))
          : [ { ...defaultSession } ]
      );
    } else {
      setTitle("");
      setInstructor("");
      setPrice("");
      setMaxParticipants("");
      setDescription("");
      setSessions([ { ...defaultSession } ]);
    }
    setErrors({});
  }, [existingCourse]);

  // prevent background scroll while modal is open
  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, []);

  // ESC to close + focus trap
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // autofocus first field on mount
  useEffect(() => {
    firstFocusableRef.current?.focus();
  }, []);

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains("modal-overlay")) onClose?.();
  };

  const handleSessionChange = (index, field, value) => {
    setSessions(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addSession = () =>
    setSessions(prev => [...prev, { ...defaultSession }]);

  const removeSession = (index) =>
    setSessions(prev => prev.filter((_, i) => i !== index));

  // --- validation helpers ---
  const validate = () => {
    const newErrors = {};

    if (!title.trim()) newErrors.title = "Required";
    if (!instructor.trim()) newErrors.instructor = "Required";
    if (price === "" || Number(price) < 0) newErrors.price = "Invalid price";
    if (
      maxParticipants === "" ||
      !Number.isFinite(Number(maxParticipants)) ||
      Number(maxParticipants) < 1
    ) {
      newErrors.maxParticipants = "Must be ≥ 1";
    }
    if (!description.trim()) newErrors.description = "Required";

    if (!sessions.length) {
      newErrors.sessions = "At least one session required";
    } else {
      sessions.forEach((s, idx) => {
        if (!s.date || !s.startTime || !s.endTime) {
          newErrors[`session_${idx}`] = "Complete all fields";
          return;
        }
        // ensure end after start (same day)
        const start = new Date(`${s.date}T${s.startTime}`);
        const end = new Date(`${s.date}T${s.endTime}`);
        if (!(start < end)) {
          newErrors[`session_${idx}`] = "End time must be after start";
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const courseData = useMemo(
    () => ({
      businessId,
      title: title.trim(),
      instructor: instructor.trim(),
      price: Number(price),
      maxParticipants: Number(maxParticipants),
      description: description.trim(),
      sessions,
    }),
    [businessId, title, instructor, price, maxParticipants, description, sessions]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    try {
      if (existingCourse?._id) {
        await api.put(`/courses/${businessId}/${existingCourse._id}`, courseData);
        toast.success("✅ Course updated");
      } else {
        await api.post(`/courses`, courseData);
        toast.success("✅ Course created");
      }
      onCourseAdded?.();
      onClose?.();
    } catch (err) {
      const msg = err?.response?.data?.message || "❌ Failed to save course";
      toast.error(msg);
    }
  };

  return (
    <div
      className="modal-overlay-add-edit-course-product"
      onMouseDown={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="course-modal-title"
    >
      <div className="modal-container" ref={modalRef}>
        <header className="modal-header">
          <h3 id="course-modal-title">
            {existingCourse ? "✏️ Edit Course" : "📘 Add New Course"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="icon-btn"
            aria-label="Close"
            ref={lastFocusableRef}
          >
            ✖
          </button>
        </header>

        <form onSubmit={handleSubmit} className="modal-content-course-product-form" noValidate>
          {/* left column */}
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="title">Title*</label>
              <input
                id="title"
                ref={firstFocusableRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? "err-title" : undefined}
                required
                placeholder="e.g., Bridal Makeup Masterclass"
              />
              {errors.title && <p id="err-title" className="error">{errors.title}</p>}
            </div>

            <div className="form-field">
              <label htmlFor="instructor">Instructor*</label>
              <input
                id="instructor"
                type="text"
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                aria-invalid={!!errors.instructor}
                aria-describedby={errors.instructor ? "err-instructor" : undefined}
                required
                placeholder="e.g., Christine Haddad"
              />
              {errors.instructor && <p id="err-instructor" className="error">{errors.instructor}</p>}
            </div>

            <div className="form-field">
              <label htmlFor="price">Price (₪)*</label>
              <input
                id="price"
                inputMode="decimal"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                aria-invalid={!!errors.price}
                aria-describedby={errors.price ? "err-price" : undefined}
                required
                placeholder="e.g., 3400"
              />
              {errors.price && <p id="err-price" className="error">{errors.price}</p>}
            </div>

            <div className="form-field">
              <label htmlFor="maxParticipants">Max Participants*</label>
              <input
                id="maxParticipants"
                type="number"
                min="1"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                aria-invalid={!!errors.maxParticipants}
                aria-describedby={errors.maxParticipants ? "err-max" : undefined}
                required
                placeholder="e.g., 60"
              />
              {errors.maxParticipants && <p id="err-max" className="error">{errors.maxParticipants}</p>}
            </div>

            <div className="form-field form-field--full">
              <label htmlFor="description">Description*</label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                aria-invalid={!!errors.description}
                aria-describedby={errors.description ? "err-desc" : undefined}
                required
                placeholder="Brief course overview, target audience, materials, etc."
              />
              {errors.description && <p id="err-desc" className="error">{errors.description}</p>}
            </div>
          </div>

          {/* sessions */}
          <div className="sessions-block">
            <div className="sessions-header">
              <label>Sessions*</label>
              <button
                type="button"
                onClick={addSession}
                className="add-session-btn"
              >
                + Add Session
              </button>
            </div>

            {errors.sessions && <p className="error">{errors.sessions}</p>}

            <div className="sessions-list">
              {sessions.map((s, index) => (
                <div key={index} className="session-row">
                  <div className="session-field">
                    <span className="session-label">Date</span>
                    <input
                      type="date"
                      value={s.date}
                      onChange={(e) => handleSessionChange(index, "date", e.target.value)}
                      required
                    />
                  </div>

                  <div className="session-field">
                    <span className="session-label">Start</span>
                    <input
                      type="time"
                      value={s.startTime}
                      onChange={(e) => handleSessionChange(index, "startTime", e.target.value)}
                      required
                    />
                  </div>

                  <div className="session-field">
                    <span className="session-label">End</span>
                    <input
                      type="time"
                      value={s.endTime}
                      onChange={(e) => handleSessionChange(index, "endTime", e.target.value)}
                      required
                    />
                  </div>

                  <div className="session-actions">
                    {sessions.length > 1 && (
                      <button
                        className="remove-session-btn"
                        onClick={() => removeSession(index)}
                        aria-label={`Remove session ${index + 1}`}
                      >
                        🗑
                      </button>
                    )}
                  </div>

                  {errors[`session_${index}`] && (
                    <p className="error session-error">{errors[`session_${index}`]}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* actions */}
          <div className="modal-courses-btns-actions">
            <button
              className="cancel-btn-course-page"
              onClick={onClose}
              aria-label="Cancel"
            >
              Cancel
            </button>
            <button
              className="submit-btn-course-page"
              ref={lastFocusableRef}
            >
              {existingCourse ? "✅ Done Editing" : "✅ Create Course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CourseFormModal;