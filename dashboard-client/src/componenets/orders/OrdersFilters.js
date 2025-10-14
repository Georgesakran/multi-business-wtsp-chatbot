import React from "react";

const SORT_OPTIONS = [
  { value: "createdAt_desc", label: "Newest" },
  { value: "createdAt_asc", label: "Oldest" },
  { value: "total_desc", label: "Total ↓" },
  { value: "total_asc", label: "Total ↑" },
  { value: "status_asc", label: "Status A→Z" },
  { value: "status_desc", label: "Status Z→A" },
];

export default function OrdersFilters({
  qDraft, setQDraft,
  statusDraft, setStatusDraft,
  paymentStatusDraft, setPaymentStatusDraft,
  dateFromDraft, setDateFromDraft,
  dateToDraft, setDateToDraft,
  totalMinDraft, setTotalMinDraft,
  totalMaxDraft, setTotalMaxDraft,
  sortByDraft, setSortByDraft,
  pending,
  onApply, onReset
}) {
  return (
    <div className="cb-filters">
      <div className="cb-row">
        <div className="cb-field cb-field--grow">
          <label htmlFor="q">Search</label>
          <input id="q" value={qDraft} onChange={(e)=>setQDraft(e.target.value)} placeholder="Order #, customer name or phone" />
        </div>
        <div className="cb-field">
          <label htmlFor="status">Status</label>
          <select id="status" value={statusDraft} onChange={(e)=>setStatusDraft(e.target.value)}>
            <option value="any">Any</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
        <div className="cb-field">
          <label htmlFor="pay">Payment</label>
          <select id="pay" value={paymentStatusDraft} onChange={(e)=>setPaymentStatusDraft(e.target.value)}>
            <option value="any">Any</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

      </div>

      <div className="cb-row">
        <div className="cb-field">
          <label htmlFor="from">Date from</label>
          <input id="from" type="date" value={dateFromDraft} onChange={(e)=>setDateFromDraft(e.target.value)} />
        </div>
        <div className="cb-field">
          <label htmlFor="to">Date to</label>
          <input id="to" type="date" value={dateToDraft} onChange={(e)=>setDateToDraft(e.target.value)} />
        </div>
        <div className="cb-field">
          <label htmlFor="minT">Total min</label>
          <input id="minT" type="number" min="0" inputMode="decimal" value={totalMinDraft} onChange={(e)=>setTotalMinDraft(e.target.value)} />
        </div>
        <div className="cb-field">
          <label htmlFor="maxT">Total max</label>
          <input id="maxT" type="number" min="0" inputMode="decimal" value={totalMaxDraft} onChange={(e)=>setTotalMaxDraft(e.target.value)} />
        </div>
      </div>

      <div className="cb-row">
      <div className="cb-field">
          <label htmlFor="sort">Sort</label>
          <select id="sort" value={sortByDraft} onChange={(e)=>setSortByDraft(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="cb-actions">
          <button className="btn ghost" onClick={onReset}>Reset</button>
          <button className={`btn primary ${pending ? "pending" : ""}`} onClick={onApply}>
            Apply {pending && <span className="filters-hint">• pending</span>}
          </button>
        </div>
      </div>
    </div>
  );
}