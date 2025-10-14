import React, { useMemo } from "react";
import "../course/FilterChips.css"; // reuse the same styles

const isSet = (v) => v !== undefined && v !== null && String(v).trim() !== "";

export default function ProductsFilterChips({
  // applied values + setters
  q, onQ,
  sku, onSku,
  category, onCategory,
  priceMin, onPriceMin,
  priceMax, onPriceMax,
  stockMin, onStockMin,
  stockMax, onStockMax,
  status, onStatus,          // 'any' | 'active' | 'archived'
  sortBy, onSortBy,          // optional, if you want a chip for sort
  onClearAll,
}) {
  const chips = useMemo(() => {
    const list = [];

    if (isSet(q)) {
      list.push({
        key: "q",
        label: `Search: ${q}`,
        clear: () => onQ("")
      });
    }

    if (isSet(sku)) {
      list.push({
        key: "sku",
        label: `SKU: ${sku}`,
        clear: () => onSku("")
      });
    }

    if (isSet(category)) {
      list.push({
        key: "category",
        label: `Category: ${category}`,
        clear: () => onCategory("")
      });
    }

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

    if (isSet(stockMin) || isSet(stockMax)) {
      const parts = [];
      if (isSet(stockMin)) parts.push(`≥ ${stockMin}`);
      if (isSet(stockMax)) parts.push(`≤ ${stockMax}`);
      list.push({
        key: "stock",
        label: `Stock ${parts.join(" & ")}`,
        clear: () => { onStockMin(""); onStockMax(""); }
      });
    }

    // status
    if (status && status !== "any") {
      const statusLabels = { active: "Active only", archived: "Archived only" };
      list.push({
        key: "status",
        label: statusLabels[status] || status,
        clear: () => onStatus("any")
      });
    }

    // Optional: show sort as a chip (if you like)
    if (isSet(sortBy) && sortBy !== "createdAt_desc") {
      const map = {
        "createdAt_desc": "Newest",
        "createdAt_asc": "Oldest",
        "price_asc": "Price ↑",
        "price_desc": "Price ↓",
        "name_asc": "Name A→Z",
        "name_desc": "Name Z→A",
        "stock_asc": "Stock ↑",
        "stock_desc": "Stock ↓",
      };
      list.push({
        key: "sort",
        label: `Sort: ${map[sortBy] || sortBy}`,
        clear: () => onSortBy?.("createdAt_desc")
      });
    }

    return list;
  }, [
    q, sku, category, priceMin, priceMax, stockMin, stockMax, status, sortBy,
    onQ, onSku, onCategory, onPriceMin, onPriceMax, onStockMin, onStockMax, onStatus, onSortBy
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