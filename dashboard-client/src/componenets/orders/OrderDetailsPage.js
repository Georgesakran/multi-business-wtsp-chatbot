// src/pages/OrderDetailsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api"; // adjust the path if your api service is elsewhere
import "./OrderDetailsPage.css";    // optional, or reuse your modal CSS

const currency = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});

function SafeImg({ src, alt }) {
  const [ok, setOk] = useState(Boolean(src));
  if (!src || !ok) return <div className="ov-thumb--ph" aria-hidden="true">🖼️</div>;
  return <img src={src} alt={alt || "product"} loading="lazy" onError={() => setOk(false)} />;
}

const thumbUrl = (it) =>
  it?.imageUrl ||
  it?.product?.image?.secure_url ||
  it?.product?.image?.url ||
  it?.image?.secure_url ||
  it?.image?.url ||
  null;

export default function OrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // fetch order
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/orders/${id}`);
        if (!cancelled) {
          setOrder(data);
          setItems(Array.isArray(data?.items) ? data.items : []);
          setNotFound(false);
        }
      } catch (e) {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // hydrate to get images (same approach as the modal)
  useEffect(() => {
    let cancelled = false;
    const businessId = order?.businessId;

    const needHydration = (row) =>
      !thumbUrl(row) && (row?.productId || row?.sku || row?.name);

    const hydrate = async () => {
      if (!businessId || !Array.isArray(order?.items) || order.items.length === 0) return;

      const rows = [...order.items];
      const targets = rows
        .map((r, i) => ({ row: r, index: i }))
        .filter(({ row }) => needHydration(row));

      if (targets.length === 0) {
        setItems(rows);
        return;
      }

      // 1) by productId
      const idTargets = targets.filter(t => t.row.productId);
      if (idTargets.length) {
        const results = await Promise.allSettled(
          idTargets.map(t => api.get(`/products/${t.row.productId}`, { params: { businessId } }))
        );
        results.forEach((res, idx) => {
          if (res.status === "fulfilled") {
            const p = res.value?.data;
            if (p && p._id) {
              const t = idTargets[idx];
              rows[t.index] = {
                ...rows[t.index],
                product: p,
                imageUrl: p?.image?.secure_url || p?.image?.url || rows[t.index]?.imageUrl || undefined,
              };
            }
          }
        });
      }

      // 2) by SKU
      const skuTargets = rows
        .map((r, i) => ({ row: r, index: i }))
        .filter(({ row }) => !thumbUrl(row) && row.sku);

      if (skuTargets.length) {
        const results = await Promise.allSettled(
          skuTargets.map(t => api.get("/products", { params: { businessId, sku: t.row.sku, limit: 1 } }))
        );
        results.forEach((res, idx) => {
          if (res.status === "fulfilled") {
            const p = res.value?.data?.items?.[0];
            if (p && p._id) {
              const t = skuTargets[idx];
              rows[t.index] = {
                ...rows[t.index],
                productId: rows[t.index].productId || p._id,
                product: p,
                imageUrl: p?.image?.secure_url || p?.image?.url || rows[t.index]?.imageUrl || undefined,
              };
            }
          }
        });
      }

      // 3) by name
      const nameTargets = rows
        .map((r, i) => ({ row: r, index: i }))
        .filter(({ row }) => !thumbUrl(row) && row.name);

      if (nameTargets.length) {
        const results = await Promise.allSettled(
          nameTargets.map(t => api.get("/products", { params: { businessId, q: t.row.name, limit: 1, sortBy: "name_asc" } }))
        );
        results.forEach((res, idx) => {
          if (res.status === "fulfilled") {
            const p = res.value?.data?.items?.[0];
            if (p && p._id) {
              const t = nameTargets[idx];
              rows[t.index] = {
                ...rows[t.index],
                productId: rows[t.index].productId || p._id,
                product: p,
                imageUrl: p?.image?.secure_url || p?.image?.url || rows[t.index]?.imageUrl || undefined,
              };
            }
          }
        });
      }

      if (!cancelled) setItems(rows);
    };

    hydrate();
    return () => { cancelled = true; };
  }, [order]);

  const fmtDate = (iso) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } catch { return "—"; }
  };

  const orderNo =
    (order && (order.number || (order._id ? `#${order._id.slice(-6)}` : "Order"))) || "Order";

  const computed = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + Number(it.price || 0) * Number(it.qty || 0), 0);
    const t = order?.totals || {};
    const discount = Number(t.discount || 0);
    const shipping = Number(t.shipping || 0);
    const tax = Number(t.tax || 0);
    const total = ("total" in t) ? Number(t.total || 0) : (subtotal - discount + shipping + tax);
    return { subtotal, discount, shipping, tax, total };
  }, [items, order?.totals]);

  if (loading) return <div className="order-page-wrap"><div className="ov-empty">Loading…</div></div>;
  if (notFound || !order) return <div className="order-page-wrap"><div className="ov-empty">Order not found.</div></div>;

  const status = (order?.status || "pending").toLowerCase();
  const paymentStatus = (order?.paymentStatus || "unpaid").toLowerCase();

  return (
    <div className="order-page-wrap">
      <header className="order-page-header">
        <button className="back-btn-orderPage" onClick={() => navigate("/owner/orders")}>←</button>
        <h2>🧾 {orderNo}</h2>
        <div className="spacer" />
      </header>

      <div className="order-page-content">
      <div className="ov-items">
          <div className="ov-section-title">Details</div>
          {items.length === 0 ? (
            <div className="ov-empty">No items.</div>
          ) : (
            <ul className="ov-item-list">
              {items.map((it, i) => {
                const qty = Number(it.qty || 0);
                const price = Number(it.price || 0);
                const line = qty * price;
                const src = thumbUrl(it);
                const title = it.name || it.product?.name || "—";
                return (
                  <li className="ov-item" key={it._id || i}>
                    <div className="ov-thumb">
                      <SafeImg src={src} alt={title} />
                    </div>
                    <div className="ov-item-main">
                      <div className="ov-item-title" title={title}>{title}</div>
                      <div className="ov-item-sub">
                        {it.sku ? `SKU: ${it.sku}` : "—"}
                      </div>

                    </div>
                    <div className="ov-item-qty">
                        X {qty}
                    </div>
                    <div className="ov-item-total">{currency.format(line)}</div>
                  </li>
                  
                );
                
              })}
                        <div className="ov-section">
            <div className="ov-section-title">Totals</div>
            <div className="ov-total-row"><span>Subtotal</span><strong>{currency.format(computed.subtotal)}</strong></div>
            {computed.discount > 0 && <div className="ov-total-row"><span>Discount</span><strong>-{currency.format(computed.discount)}</strong></div>}
            {computed.shipping > 0 && <div className="ov-total-row"><span>Shipping</span><strong>{currency.format(computed.shipping)}</strong></div>}
            {computed.tax > 0 && <div className="ov-total-row"><span>Tax</span><strong>{currency.format(computed.tax)}</strong></div>}
            <div className="ov-total-row ov-grand"><span>Total</span><strong>{currency.format(computed.total)}</strong></div>
          </div>
            </ul>
          )}
        </div>


        
        <div className="ov-top">
          
          <div className="ov-section">
            <div className="ov-section-title">Customer</div>
            <div className="ov-kv"><span>Name</span><strong>{order.customer?.name || "—"}</strong></div>
            <div className="ov-kv"><span>Phone</span><strong>{order.customer?.phone || "—"}</strong></div>
            {order.customer?.email && (
              <div className="ov-kv"><span>Email</span><strong>{order.customer.email}</strong></div>
            )}
          </div>

          <div className="line-between-sections"></div>

          <div className="ov-section">
            <div className="ov-section-title">Status</div>
            <div className="ov-badges">
              <span className={`status-badge o-${status}`}>{status}</span>
              <span className={`status-badge p-${paymentStatus}`}>{paymentStatus}</span>
            </div>
            <div className="ov-kv"><span>Created</span><strong>{fmtDate(order.createdAt)}</strong></div>
            {order.updatedAt && (
              <div className="ov-kv"><span>Updated</span><strong>{fmtDate(order.updatedAt)}</strong></div>
            )}
            {order.paymentMethod && (
              <div className="ov-kv"><span>Payment Method</span><strong>{order.paymentMethod}</strong></div>
            )}
          </div>

          {order.notes && order.notes.trim() ? (
            <>
              <div className="line-between-sections"></div>
              <div className="ov-notes">
                <div className="ov-section-title">Notes</div>
                <p>{order.notes}</p>
              </div>
            </>
          ) : null}


        </div>





      </div>
    </div>
  );
}