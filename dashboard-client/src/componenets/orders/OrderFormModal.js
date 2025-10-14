 // src/componenets/orders/OrderFormModal.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";
import ProductSelect from "./ProductSelect";
import { toast } from "react-toastify";

export default function OrderFormModal({ businessId, existingOrder, onClose, onOrderSaved }) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [status, setStatus] = useState("pending");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [paymentMethod, setPaymentMethod] = useState("other");

  // each row: name, sku, price (string), qty (string), _product (object), productId, userPriceTouched
  const [items, setItems] = useState([
    { name: "", sku: "", price: "", qty: "1", userPriceTouched: false },
  ]);

  const [notes, setNotes] = useState("");

  const modalRef = useRef(null);
  const firstRef = useRef(null);

// ---------- Hydration helper: attach real product docs (with image) ----------
const hasImage = (p) => !!(p?.image?.secure_url || p?.image?.url || p?.imageUrl);

const hydrateProductsForRows = async (rows) => {
  if (!businessId) return rows;

  // We must hydrate rows where:
  // 1) There is NO _product, or
  // 2) There IS _product but it has NO image.
  const needsHydration = rows.filter(
    (r) => !r._product || !hasImage(r._product)
  );

  // Split by strategy
  const needById = needsHydration.filter((r) => r.productId);
  const needByGuess = needsHydration.filter((r) => !r.productId && (r.sku || r.name));

  const ids = Array.from(new Set(needById.map((r) => String(r.productId))));
  const byId = {};

  // 1) Bulk by id (then fallback one-by-one)
  if (ids.length) {
    try {
      const { data } = await api.get("/products/bulk", {
        params: { businessId, ids: ids.join(",") },
      });
      const list = (data?.items || data || []).filter(Boolean);
      for (const p of list) byId[String(p._id)] = p;
    } catch {
      const results = await Promise.allSettled(
        ids.map((id) => api.get(`/products/${id}`, { params: { businessId } }))
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          const p = r.value?.data;
          if (p?._id) byId[String(p._id)] = p;
        }
      }
    }
  }

  // 2) Guess by SKU/Name for rows without productId
  if (needByGuess.length) {
    const guesses = await Promise.allSettled(
      needByGuess.map(async (r) => {
        if (r.sku) {
          const { data } = await api.get("/products", { params: { businessId, sku: r.sku, limit: 1 } });
          return data?.items?.[0] || null;
        }
        if (r.name) {
          const { data } = await api.get("/products", { params: { businessId, q: r.name, limit: 1, sortBy: "name_asc" } });
          return data?.items?.[0] || null;
        }
        return null;
      })
    );

    guesses.forEach((res, idx) => {
      const row = needByGuess[idx];
      if (res.status === "fulfilled" && res.value && res.value._id) {
        const p = res.value;
        byId[String(p._id)] = p;
        // normalize so the mapping step can pick it up
        row.productId = String(p._id);
      }
    });
  }

  // 3) Build the final rows:
  return rows.map((r) => {
    // If we already have a product WITH an image, keep it.
    if (r._product && hasImage(r._product)) return r;

    // Otherwise try to upgrade from the pool we fetched
    const p = r.productId ? byId[String(r.productId)] : null;
    if (!p) return r;

    // Merge/upgrade to the hydrated product (preserve user-edited price)
    return {
      ...r,
      _product: p,
      name: r.name || p.name || "",
      sku: r.sku || p.sku || "",
      price: r.userPriceTouched ? r.price : String(p.price ?? r.price ?? 0),
    };
  });
};

  // ---------- Initialize from existingOrder (Edit) OR empty (Create) ----------
  useEffect(() => {
    const load = async () => {
      if (existingOrder) {
        setCustomerName(existingOrder.customer?.name || "");
        setCustomerPhone(existingOrder.customer?.phone || "");
        setStatus(existingOrder.status || "pending");
        setPaymentStatus(existingOrder.paymentStatus || "unpaid");

        const baseRows =
          (existingOrder.items || []).map(it => {
            // Accept shapes: productId, product (ObjectId or populated object), product._id
            const pid =
              it.productId ||
              (typeof it.product === "string" ? it.product : it.product?._id) ||
              null;

            // Seed a lightweight _product so the chip shows instantly (even before hydration)
            const seededProduct = {
              _id: pid || undefined,
              name: it.name || it.product?.name || "",
              sku: it.sku || it.product?.sku || "",
              price: it.price ?? it.product?.price ?? 0,
              // or embedded image object:
              image: it.image || it.product?.image || (it.imageUrl ? { url: it.imageUrl } : undefined),
            };

            return {
              name: it.name || "",
              sku: it.sku || "",
              price: String(it.price ?? ""),
              qty: String(it.qty ?? "1"),
              _product: seededProduct,      // chip shows now
              productId: pid,               // hydration improves later
              userPriceTouched: false,
            };
          }) || [
            { name: "", sku: "", price: "", qty: "1", userPriceTouched: false },
          ];

        const hydrated = await hydrateProductsForRows(baseRows);
        setItems(hydrated);
        setNotes(existingOrder.notes || "");
      } else {
        setCustomerName("");
        setCustomerPhone("");
        setStatus("pending");
        setPaymentStatus("unpaid");
        setItems([{ name: "", sku: "", price: "", qty: "1", userPriceTouched: false }]);
        setNotes("");
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingOrder, businessId]);

  // ---------- Body lock + autofocus ----------
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  useEffect(() => { firstRef.current?.focus(); }, []);

  const handleOverlay = (e) => { if (e.target === e.currentTarget) onClose?.(); };

  // ---------- Row helpers ----------
  const addRow = () =>
    setItems(v => [...v, { name: "", sku: "", price: "", qty: "1", userPriceTouched: false }]);

  const removeRow = (i) => setItems(v => v.filter((_, idx) => idx !== i));

  const setRow = (rowIdx, key, val) => {
    setItems(prev => prev.map((row, idx) => (idx === rowIdx ? { ...row, [key]: val } : row)));
  };

  const onPickProduct = (rowIdx, p) => {
    setItems(prev =>
      prev.map((row, idx) => {
        if (idx !== rowIdx) return row;
        const shouldOverwritePrice = !row.userPriceTouched;
        return {
          ...row,
          _product: p || undefined,
          productId: p?._id || null,
          name: p?.name || "",
          sku: p?.sku || "",
          price: shouldOverwritePrice ? String(p?.price ?? 0) : row.price,
        };
      })
    );
  };

  const resetRowPriceToProduct = (rowIdx) => {
    setItems(prev =>
      prev.map((row, idx) => {
        if (idx !== rowIdx) return row;
        const prodPrice = row._product?.price ?? 0;
        return { ...row, price: String(prodPrice), userPriceTouched: false };
      })
    );
  };

  // ---------- Derived: parsed items & totals ----------
  const parsedItems = useMemo(
    () =>
      items
        .filter(it => (it.name?.trim() || it._product) && Number(it.qty) > 0 && Number(it.price) >= 0)
        .map(it => {
          const price = Number(it.price || (it._product?.price ?? 0));
          const qty = Number(it.qty || 1);
  
          const imageUrl =
            it.imageUrl ||
            it._product?.image?.secure_url ||
            it._product?.image?.url ||
            it._product?.imageUrl ||
            null;
  
          return {
            productId: it.productId || it._product?._id,
            name: (it.name || it._product?.name || "").trim(),
            sku: (it.sku || it._product?.sku || "").trim() || undefined,
            imageUrl,   // ✅ now included
            price,
            qty
          };
        }),
    [items]
  );

  const totals = useMemo(() => {
    const subtotal = parsedItems.reduce((s, it) => s + it.price * it.qty, 0);
    return { subtotal, discount: 0, shipping: 0, tax: 0, total: subtotal };
  }, [parsedItems]);

  const payload = useMemo(
    () => ({
      businessId,
      customer: { name: customerName.trim(), phone: customerPhone.trim() },
      items: parsedItems,
      status,
      paymentStatus,
      paymentMethod,   // NEW
      totals,
      notes: notes.trim(),
      meta: {} // placeholder, or build from UI if needed
    }),
    [businessId, customerName, customerPhone, parsedItems, status, paymentStatus, paymentMethod, notes, totals]
  );

  // ---------- Submit ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!businessId) return toast.error("Missing business ID.");
    if (!customerName.trim()) return toast.error("Customer name is required.");
    if (!parsedItems.length) return toast.error("Add at least one item.");

    try {
      if (existingOrder?._id) {
        await api.put(`/orders/${existingOrder._id}`, payload);
        toast.success("✅ Order updated");
      } else {
        await api.post("/orders", payload);
        toast.success("✅ Order created");
      }
      onOrderSaved?.();
      onClose?.();
    } catch (err) {
      const msg = err?.response?.data?.message || "❌ Failed to save order";
      toast.error(msg);
    }
  };

  return (
    <div
      className="modal-overlay-add-edit-course-product"
      onMouseDown={handleOverlay}
      aria-modal="true"
      role="dialog"
      aria-labelledby="order-modal-title"
    >
      <div className="modal-container" ref={modalRef}>
        <header className="modal-header">
          <h3 id="order-modal-title">{existingOrder ? "✏️ Edit Order" : "➕ Create Order"}</h3>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>✖</button>
        </header>

        <form className="modal-content-course-product-form" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            {/* Customer */}
            <div className="form-field">
              <label htmlFor="cust-name">Customer Name*</label>
              <input
                id="cust-name"
                ref={firstRef}
                value={customerName}
                onChange={(e)=>setCustomerName(e.target.value)}
                placeholder="e.g., Sarah Levi"
              />
            </div>
            <div className="form-field">
              <label htmlFor="cust-phone">Phone</label>
              <input
                id="cust-phone"
                value={customerPhone}
                onChange={(e)=>setCustomerPhone(e.target.value)}
                placeholder="05x-xxxxxxx"
              />
            </div>

            {/* Status */}
            <div className="form-field">
              <label htmlFor="status">Status</label>
              <select id="status" value={status} onChange={(e)=>setStatus(e.target.value)}>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="pstatus">Payment</label>
              <select id="pstatus" value={paymentStatus} onChange={(e)=>setPaymentStatus(e.target.value)}>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            {/* Items */}
            <div className="form-field form-field--full">
              <label>Items</label>
              <div className="sessions-list">
                {items.map((it, i) => (
                  <div className="session-row" key={i}>
                    {/* Product picker */}
                    <div className="session-field" style={{ gridColumn: "1 / -1" }}>
                      <span className="session-label">Product</span>
                      <ProductSelect
                        businessId={businessId}
                        value={it._product || null}
                        onChange={(p) => onPickProduct(i, p)}
                      />
                    </div>

                    {/* Price */}
                    <div className="session-field">
                      <span className="session-label">Price</span>
                      {it._product && (
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => resetRowPriceToProduct(i)}
                          style={{ marginTop: 6 }}
                          title="Reset to product price"
                        >
                          ↩ Reset to product price ({it._product.price ?? 0}₪)
                        </button>
                      )}
                      <input
                        type="number"
                        min="0"
                        inputMode="decimal"
                        value={it.price}
                        onChange={(e)=> setItems(rows => rows.map((row, idx)=>
                          idx===i ? { ...row, price: e.target.value, userPriceTouched: true } : row))}
                        placeholder="0"
                      />
                    </div>

                    {/* Qty */}
                    <div className="session-field">
                      <span className="session-label">Qty</span>
                      <input
                        type="number"
                        min="1"
                        value={it.qty}
                        onChange={(e)=> setRow(i, "qty", e.target.value)}
                      />
                    </div>

                    {/* Remove */}
                    <div className="session-actions">
                      <button type="button" className="remove-session-btn" onClick={()=> removeRow(i)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="add-session-btn" onClick={addRow}>+ Add item</button>

            </div>

            {/* Payment method */}
            <div className="form-field">
              <label htmlFor="pmethod">Payment Method</label>
              <select id="pmethod" value={paymentMethod} onChange={(e)=>setPaymentMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="transfer">Bank Transfer</option>
                <option value="link">Payment Link</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Customer note */}
            <div className="form-field form-field--full">
              <label htmlFor="customerNote">Customer Note</label>
              <textarea
                id="customerNote"
                rows={2}
                value={notes}
                onChange={(e)=>setNotes(e.target.value)}
                placeholder="Visible to the customer…"
              />
            </div>

 

            {/* Totals Preview */}
            <div className="form-field">
              <label>Totals</label>
              <div>
                Subtotal: <strong>{totals.subtotal.toFixed(0)}₪</strong><br/>
                Total: <strong>{totals.total.toFixed(0)}₪</strong>
              </div>
            </div>
          </div>

          <div className="modal-courses-btns-actions">
            <button type="button" className="cancel-btn-course-page" onClick={onClose}>Cancel</button>
            <button className="submit-btn-course-page">
              {existingOrder ? "✅ Save Changes" : "✅ Create Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}