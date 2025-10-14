import React, { useMemo } from "react";
import "../course/FilterChips.css";

const isSet = (v) => v !== undefined && v !== null && String(v).trim() !== "";

export default function OrdersFilterChips({
  q, onQ,
  status, onStatus,
  paymentStatus, onPaymentStatus,
  dateFrom, onDateFrom,
  dateTo, onDateTo,
  totalMin, onTotalMin,
  totalMax, onTotalMax,
  sortBy, onSortBy,
  onClearAll
}) {
  const chips = useMemo(() => {
    const list = [];

    if (isSet(q)) list.push({ key:"q", label:`Search: ${q}`, clear:()=>onQ("") });

    if (status && status !== "any") {
      const map = { pending:"Pending", paid:"Paid", fulfilled:"Fulfilled", cancelled:"Cancelled", refunded:"Refunded" };
      list.push({ key:"status", label:`Status: ${map[status]||status}`, clear:()=>onStatus("any") });
    }

    if (paymentStatus && paymentStatus !== "any") {
      const map = { unpaid:"Unpaid", paid:"Paid", partial:"Partial", refunded:"Refunded" };
      list.push({ key:"payment", label:`Payment: ${map[paymentStatus]||paymentStatus}`, clear:()=>onPaymentStatus("any") });
    }

    if (isSet(dateFrom) || isSet(dateTo)) {
      const parts = [];
      if (isSet(dateFrom)) parts.push(`from ${dateFrom}`);
      if (isSet(dateTo)) parts.push(`to ${dateTo}`);
      list.push({ key:"dates", label:`Dates ${parts.join(" ")}`, clear:()=>{ onDateFrom(""); onDateTo(""); } });
    }

    if (isSet(totalMin) || isSet(totalMax)) {
      const parts = [];
      if (isSet(totalMin)) parts.push(`≥ ${totalMin}₪`);
      if (isSet(totalMax)) parts.push(`≤ ${totalMax}₪`);
      list.push({ key:"total", label:`Total ${parts.join(" & ")}`, clear:()=>{ onTotalMin(""); onTotalMax(""); } });
    }

    if (isSet(sortBy) && sortBy !== "createdAt_desc") {
      const map = {
        "createdAt_desc": "Newest",
        "createdAt_asc": "Oldest",
        "total_desc": "Total ↓",
        "total_asc": "Total ↑",
        "status_asc": "Status A→Z",
        "status_desc": "Status Z→A",
      };
      list.push({ key:"sort", label:`Sort: ${map[sortBy]||sortBy}`, clear:()=>onSortBy?.("createdAt_desc") });
    }

    return list;
  }, [q,status,paymentStatus,dateFrom,dateTo,totalMin,totalMax,sortBy,onQ,onStatus,onPaymentStatus,onDateFrom,onDateTo,onTotalMin,onTotalMax,onSortBy]);

  if (!chips.length) return null;

  return (
    <div className="chips-wrap" aria-label="Active filters">
      <ul className="chips-list">
        {chips.map(c => (
          <li key={c.key} className="chip">
            <span className="chip-label">{c.label}</span>
            <button type="button" className="chip-x" onClick={c.clear} aria-label={`Clear ${c.key}`}>×</button>
          </li>
        ))}
        <li className="chip chip-clear-all">
          <button type="button" className="chip-clear-btn" onClick={onClearAll}>Clear all</button>
        </li>
      </ul>
    </div>
  );
}