// src/pages/OrdersPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import OrdersTable from "../componenets/orders/OrdersTable";
import OrdersFilters from "../componenets/orders/OrdersFilters";
import OrderFormModal from "../componenets/orders/OrderFormModal";
import OrdersFilterChips from "../componenets/orders/OrdersFilterChips";
import { toast } from "react-toastify";
import "../styles/ProductsPage.css"; // re-use same styles (filters, buttons, pagination)

const PAGE_SIZE = 10;
const safeGetUser = () => { try { return JSON.parse(localStorage.getItem("user")) || null; } catch { return null; } };

export default function OrdersPage() {
  const navigate = useNavigate();

  const user = safeGetUser();
  const businessId = user?.businessId ?? null;

  // data
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // DRAFT (UI)
  const [qDraft, setQDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState("any");
  const [paymentStatusDraft, setPaymentStatusDraft] = useState("any");
  const [dateFromDraft, setDateFromDraft] = useState("");
  const [dateToDraft, setDateToDraft] = useState("");
  const [totalMinDraft, setTotalMinDraft] = useState("");
  const [totalMaxDraft, setTotalMaxDraft] = useState("");
  const [sortByDraft, setSortByDraft] = useState("createdAt_desc");

  // APPLIED (query)
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("any");
  const [paymentStatus, setPaymentStatus] = useState("any");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [totalMin, setTotalMin] = useState("");
  const [totalMax, setTotalMax] = useState("");
  const [sortBy, setSortBy] = useState("createdAt_desc");
  const [page, setPage] = useState(1);

  const hasPending =
    qDraft!==q || statusDraft!==status || paymentStatusDraft!==paymentStatus ||
    dateFromDraft!==dateFrom || dateToDraft!==dateTo ||
    totalMinDraft!==totalMin || totalMaxDraft!==totalMax ||
    sortByDraft!==sortBy;

  // INIT from URL
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const initial = {
      q: p.get("q") || "",
      status: p.get("status") || "any",
      paymentStatus: p.get("paymentStatus") || "any",
      dateFrom: p.get("dateFrom") || "",
      dateTo: p.get("dateTo") || "",
      totalMin: p.get("totalMin") || "",
      totalMax: p.get("totalMax") || "",
      sortBy: p.get("sortBy") || "createdAt_desc",
      page: Number(p.get("page") || 1),
    };
    setQ(initial.q); setStatus(initial.status); setPaymentStatus(initial.paymentStatus);
    setDateFrom(initial.dateFrom); setDateTo(initial.dateTo);
    setTotalMin(initial.totalMin); setTotalMax(initial.totalMax);
    setSortBy(initial.sortBy); setPage(initial.page);

    setQDraft(initial.q); setStatusDraft(initial.status); setPaymentStatusDraft(initial.paymentStatus);
    setDateFromDraft(initial.dateFrom); setDateToDraft(initial.dateTo);
    setTotalMinDraft(initial.totalMin); setTotalMaxDraft(initial.totalMax);
    setSortByDraft(initial.sortBy);
  }, []);

  // URL sync
  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status !== "any") p.set("status", status);
    if (paymentStatus !== "any") p.set("paymentStatus", paymentStatus);
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);
    if (totalMin) p.set("totalMin", totalMin);
    if (totalMax) p.set("totalMax", totalMax);
    if (sortBy !== "createdAt_desc") p.set("sortBy", sortBy);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    const clean = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", clean);
  }, [q,status,paymentStatus,dateFrom,dateTo,totalMin,totalMax,sortBy,page]);

  // lock body when mobile filter sheet is open
  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mobileFiltersOpen]);

  const params = useMemo(() => ({
    businessId,
    q: q || undefined,
    status: status !== "any" ? status : undefined,
    paymentStatus: paymentStatus !== "any" ? paymentStatus : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    totalMin: totalMin || undefined,
    totalMax: totalMax || undefined,
    sortBy, page, limit: PAGE_SIZE
  }), [businessId,q,status,paymentStatus,dateFrom,dateTo,totalMin,totalMax,sortBy,page]);

  const fetchOrders = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const { data } = await api.get("/orders", { params });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("❌ Failed to load orders");
    } finally { setLoading(false); }
  }, [businessId, params]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleApply = () => {
    if (totalMinDraft && totalMaxDraft && Number(totalMinDraft) > Number(totalMaxDraft)) {
      const t = totalMinDraft; setTotalMinDraft(totalMaxDraft); setTotalMaxDraft(t);
    }
    setQ(qDraft); setStatus(statusDraft); setPaymentStatus(paymentStatusDraft);
    setDateFrom(dateFromDraft); setDateTo(dateToDraft);
    setTotalMin(totalMinDraft); setTotalMax(totalMaxDraft);
    setSortBy(sortByDraft); setPage(1);
  };

  const handleReset = () => {
    setQDraft(""); setStatusDraft("any"); setPaymentStatusDraft("any");
    setDateFromDraft(""); setDateToDraft(""); setTotalMinDraft(""); setTotalMaxDraft("");
    setSortByDraft("createdAt_desc");

    setQ(""); setStatus("any"); setPaymentStatus("any");
    setDateFrom(""); setDateTo(""); setTotalMin(""); setTotalMax("");
    setSortBy("createdAt_desc"); setPage(1);
  };

  const handleDelete = async (id) => {
    if (!businessId) return toast.error("❌ Missing business ID");
    if (!window.confirm("Delete this order?")) return;
    try {
      await api.delete(`/orders/${id}`, { params: { businessId } });
      toast.success("✅ Order deleted");
      fetchOrders();
    } catch { toast.error("❌ Failed to delete order"); }
  };

  if (!businessId) {
    return (
      <div className="products-page">
        <p>You’re not linked to a business. Please log in again.</p>
      </div>
    );
  }

  return (
    <div className="products-page">
      <div className="products-header">

        {/* Mobile filter trigger */}
        <button
          className="filters-trigger"
          onClick={() => setMobileFiltersOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={mobileFiltersOpen}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 5h18M6 12h12M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Filters
          {hasPending && <span className="filters-dot" aria-hidden="true"></span>}
        </button>

        <button
          className="add-product-btn"
          onClick={() => { setEditOrder(null); setShowFormModal(true); }}
        >
          ➕ Add Order
        </button>
      </div>

      <div className="filters-inline">
        <OrdersFilters
          qDraft={qDraft} setQDraft={setQDraft}
          statusDraft={statusDraft} setStatusDraft={setStatusDraft}
          paymentStatusDraft={paymentStatusDraft} setPaymentStatusDraft={setPaymentStatusDraft}
          dateFromDraft={dateFromDraft} setDateFromDraft={setDateFromDraft}
          dateToDraft={dateToDraft} setDateToDraft={setDateToDraft}
          totalMinDraft={totalMinDraft} setTotalMinDraft={setTotalMinDraft}
          totalMaxDraft={totalMaxDraft} setTotalMaxDraft={setTotalMaxDraft}
          sortByDraft={sortByDraft} setSortByDraft={setSortByDraft}
          pending={hasPending}
          onApply={handleApply}
          onReset={handleReset}
        />
      </div>

      <OrdersFilterChips
        q={q} onQ={(v)=>{ setQ(v); setQDraft(v); setPage(1); }}
        status={status} onStatus={(v)=>{ setStatus(v); setStatusDraft(v); setPage(1); }}
        paymentStatus={paymentStatus} onPaymentStatus={(v)=>{ setPaymentStatus(v); setPaymentStatusDraft(v); setPage(1); }}
        dateFrom={dateFrom} onDateFrom={(v)=>{ setDateFrom(v); setDateFromDraft(v); setPage(1); }}
        dateTo={dateTo} onDateTo={(v)=>{ setDateTo(v); setDateToDraft(v); setPage(1); }}
        totalMin={totalMin} onTotalMin={(v)=>{ setTotalMin(v); setTotalMinDraft(v); setPage(1); }}
        totalMax={totalMax} onTotalMax={(v)=>{ setTotalMax(v); setTotalMaxDraft(v); setPage(1); }}
        sortBy={sortBy} onSortBy={(v)=>{ setSortBy(v); setSortByDraft(v); setPage(1); }}
        onClearAll={handleReset}
      />

      {loading ? (
        <div className="products-loading" aria-busy="true"></div>
      ) : items.length === 0 ? (
        <div className="products-empty">
          <p>No orders match your filters.</p>
          <button
            className="add-product-btn"
            onClick={() => { setEditOrder(null); setShowFormModal(true); }}
          >
            ➕ Add your first order
          </button>
        </div>
      ) : (
        <>
          <OrdersTable
            orders={items}
            onView={(o)=> navigate(`/owner/orders/${o._id}`)}   // view details page
            onEdit={(o) => { setEditOrder(o); setShowFormModal(true); }}
            onDelete={handleDelete}
          />
          <div className="cb-pagination" role="navigation" aria-label="pagination" style={{ marginTop: 12 }}>
            <button className="cb-page-btn" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>‹ Prev</button>
            <span className="cb-page-indicator">Page {page} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
            <button className="cb-page-btn" disabled={page>=Math.max(1, Math.ceil(total / PAGE_SIZE))} onClick={()=>setPage(p=>p+1)}>Next ›</button>
          </div>
        </>
      )}

      {/* Mobile filters bottom-sheet */}
      {mobileFiltersOpen && (
        <div className="filters-sheet" role="dialog">
          <div className="filters-panel" role="document">
            <div className="filters-panel-header">
              <h3 id="filters-title">Filters</h3>
              <button className="icon-btn" aria-label="Close filters" onClick={() => setMobileFiltersOpen(false)}>✕</button>
            </div>
            <div className="filters-panel-body">
              <OrdersFilters
                qDraft={qDraft} setQDraft={setQDraft}
                statusDraft={statusDraft} setStatusDraft={setStatusDraft}
                paymentStatusDraft={paymentStatusDraft} setPaymentStatusDraft={setPaymentStatusDraft}
                dateFromDraft={dateFromDraft} setDateFromDraft={setDateFromDraft}
                dateToDraft={dateToDraft} setDateToDraft={setDateToDraft}
                totalMinDraft={totalMinDraft} setTotalMinDraft={setTotalMinDraft}
                totalMaxDraft={totalMaxDraft} setTotalMaxDraft={setTotalMaxDraft}
                sortByDraft={sortByDraft} setSortByDraft={setSortByDraft}
                pending={hasPending}
                onApply={() => { handleApply(); setMobileFiltersOpen(false); }}
                onReset={handleReset}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit stays as a modal */}
      {showFormModal && (
        <OrderFormModal
          businessId={businessId}
          existingOrder={editOrder}           // null = create
          onClose={() => setShowFormModal(false)}
          onOrderSaved={fetchOrders}
        />
      )}
    </div>
  );
}