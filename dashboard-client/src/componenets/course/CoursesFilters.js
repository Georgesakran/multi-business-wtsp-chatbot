import React from "react";
import "./CoursesFilters.css";

const SORT_OPTIONS = [
  { value: "createdAt_desc", label: "Newest" },
  { value: "createdAt_asc",  label: "Oldest" },
  { value: "price_asc",      label: "Price: Low → High" },
  { value: "price_desc",     label: "Price: High → Low" },
  { value: "title_asc",      label: "Title A → Z" },
  { value: "title_desc",     label: "Title Z → A" },
];

/**
 * This component is PURELY a controlled form for DRAFT values.
 * It never fetches. It never mutates the URL.
 * Parents pass draft values + setters, and an onApply() handler.
 */
const CoursesFilters = ({
  // DRAFT state + setters
  qDraft, setQDraft,
  instructorDraft, setInstructorDraft,
  priceMinDraft, setPriceMinDraft,
  priceMaxDraft, setPriceMaxDraft,
  capacityMinDraft, setCapacityMinDraft,
  capacityMaxDraft, setCapacityMaxDraft,
  dateFromDraft, setDateFromDraft,
  dateToDraft, setDateToDraft,
  statusDraft, setStatusDraft,
  sortByDraft, setSortByDraft,
  pending,
  onApply, onReset
}) => {
  // Submit on Enter
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onApply?.();
    }
  };
  

  return (
    <section className="cb-filters" aria-label="filters" onKeyDown={handleKeyDown}>
      {/* Row 1: search + instructor + sort */}
      <div className="cb-row">
        <div className="cb-field cb-field--grow">
          <label htmlFor="q">Search</label>
          <input
            id="q"
            type="search"
            placeholder="Search title/description…"
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
          />
        </div>

        <div className="cb-field">
          <label htmlFor="instructor">Instructor</label>
          <input
            id="instructor"
            type="text"
            placeholder="e.g., Christine"
            value={instructorDraft}
            onChange={(e) => setInstructorDraft(e.target.value)}
          />
        </div>

        <div className="cb-field">
          <label htmlFor="sort">Sort</label>
          <select
            id="sort"
            value={sortByDraft}
            onChange={(e) => setSortByDraft(e.target.value)}
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Row 2: price + capacity */}
      <div className="cb-row">
        <div className="cb-field">
          <label htmlFor="priceMin">Min Price</label>
          <input
            id="priceMin"
            type="number"
            inputMode="decimal"
            min="0"
            value={priceMinDraft}
            onChange={(e) => setPriceMinDraft(e.target.value)}
          />
        </div>

        <div className="cb-field">
          <label htmlFor="priceMax">Max Price</label>
          <input
            id="priceMax"
            type="number"
            inputMode="decimal"
            min="0"
            value={priceMaxDraft}
            onChange={(e) => setPriceMaxDraft(e.target.value)}
          />
        </div>

        <div className="cb-field">
          <label htmlFor="capacityMin">Min Capacity</label>
          <input
            id="capacityMin"
            type="number"
            min="1"
            value={capacityMinDraft}
            onChange={(e) => setCapacityMinDraft(e.target.value)}
          />
        </div>

        <div className="cb-field">
          <label htmlFor="capacityMax">Max Capacity</label>
          <input
            id="capacityMax"
            type="number"
            min="1"
            value={capacityMaxDraft}
            onChange={(e) => setCapacityMaxDraft(e.target.value)}
          />
        </div>
      </div>

      {/* Row 3: date range + status */}
      <div className="cb-row">
        <div className="cb-field">
          <label htmlFor="dateFrom">From</label>
          <input
            id="dateFrom"
            type="date"
            value={dateFromDraft}
            onChange={(e) => setDateFromDraft(e.target.value)}
          />
        </div>

        <div className="cb-field">
          <label htmlFor="dateTo">To</label>
          <input
            id="dateTo"
            type="date"
            value={dateToDraft}
            onChange={(e) => setDateToDraft(e.target.value)}
          />
        </div>

        <div className="cb-field">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={statusDraft}
            onChange={(e) => setStatusDraft(e.target.value)}
          >
            <option value="any">Any</option>
            <option value="done">Done</option>
            <option value="in-progress">In Progress</option>
            <option value="upcoming">Upcoming</option>
          </select>
        </div>


        <div className="cb-actions">
        {pending && (
            <span id="filters-pending-hint" className="filters-hint">
              You have unapplied filter changes.
            </span>
          )}
          <button type="button" className="btn ghost" onClick={onReset}>Reset</button>
          <button type="button" className={`btn primary ${pending ? "pending" : ""}`} onClick={onApply} aria-describedby={pending ? "filters-pending-hint" : undefined}>Apply</button>

        </div>
      </div>
    </section>
  );
};

export default CoursesFilters;