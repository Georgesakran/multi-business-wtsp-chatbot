import React, { useMemo } from "react";
import "./FilterChips.css";

const isSet = (v) => v !== undefined && v !== null && String(v).trim() !== "";

export default function FilterChips({
  q, onQ,
  instructor, onInstructor,
  priceMin, onPriceMin,
  priceMax, onPriceMax,
  capacityMin, onCapacityMin,
  capacityMax, onCapacityMax,
  dateFrom, onDateFrom,
  dateTo, onDateTo,
  status, onStatus,        // 'any' | 'upcoming' | 'past'
  sortBy, onSortBy,        // keep for "Clear all"
  onClearAll,              // callback to reset everything
}) {
  const chips = useMemo(() => {
    const list = [];

    if (isSet(q)) list.push({
      key: "q",
      label: `Search: ${q}`,
      clear: () => onQ("")
    });

    if (isSet(instructor)) list.push({
      key: "instructor",
      label: `Instructor: ${instructor}`,
      clear: () => onInstructor("")
    });

    if (isSet(priceMin) || isSet(priceMax)) {
      const parts = [];
      if (isSet(priceMin)) parts.push(`≥ ${priceMin}₪`);
      if (isSet(priceMax)) parts.push(`≤ ${priceMax}₪`);
      list.push({
        key: "price",
        label: `Price ${parts.join(" & ")}`,
        clear: () => { onPriceMin(""); onPriceMax(""); }
      });
    }

    if (isSet(capacityMin) || isSet(capacityMax)) {
      const parts = [];
      if (isSet(capacityMin)) parts.push(`≥ ${capacityMin}`);
      if (isSet(capacityMax)) parts.push(`≤ ${capacityMax}`);
      list.push({
        key: "capacity",
        label: `Capacity ${parts.join(" & ")}`,
        clear: () => { onCapacityMin(""); onCapacityMax(""); }
      });
    }

    if (isSet(dateFrom) || isSet(dateTo)) {
      const parts = [];
      if (isSet(dateFrom)) parts.push(`from ${dateFrom}`);
      if (isSet(dateTo)) parts.push(`to ${dateTo}`);
      list.push({
        key: "dates",
        label: `Dates ${parts.join(" ")}`,
        clear: () => { onDateFrom(""); onDateTo(""); }
      });
    }

          if (status && status !== "any") {
            const statusLabels = {
              done: "Done only",
              "in-progress": "In Progress only",
              upcoming: "Upcoming only",
            };
            list.push({
              key: "status",
              label: statusLabels[status] || status,
              clear: () => onStatus("any"),
            });
          }

    return list;
  }, [
    q, instructor, priceMin, priceMax, capacityMin, capacityMax,
    dateFrom, dateTo, status,
    onQ, onInstructor, onPriceMin, onPriceMax, onCapacityMin, onCapacityMax, onDateFrom, onDateTo, onStatus
  ]);

  if (!chips.length) return null;

  return (
    <div className="chips-wrap" aria-label="Active filters">
      <ul className="chips-list">
        {chips.map(chip => (
          <li key={chip.key} className="chip">
            <span className="chip-label">{chip.label}</span>
            <button
              type="button"
              className="chip-x"
              aria-label={`Clear ${chip.key}`}
              onClick={chip.clear}
            >
              ×
            </button>
          </li>
        ))}

        {/* Clear all */}
        <li className="chip chip-clear-all">
          <button
            type="button"
            className="chip-clear-btn"
            onClick={onClearAll}
            aria-label="Clear all filters"
          >
            Clear all
          </button>
        </li>
      </ul>
    </div>
  );
}