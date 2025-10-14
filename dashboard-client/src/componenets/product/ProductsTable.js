// components/product/ProductsTable.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

// Build a robust image URL from your product doc
const getProductImage = (p) => {
  const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  const direct =
    p?.image?.secure_url ||
    p?.image?.url ||
    p?.imageUrl || // legacy fallback if ever used
    null;
  const publicId = p?.image?.public_id || null;

  if (direct) return direct;
  if (publicId && cloudName) {
    // auto format/quality from Cloudinary
    return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_300,h_300,c_fill/${publicId}`;
  }
  return null;
};

const ProductsTable = ({ products, onView, onEdit, onDelete }) => {
  const [openIdx, setOpenIdx] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const btnRefs = useRef({});

  const fmt = useMemo(
    () =>
      new Intl.NumberFormat("he-IL", {
        style: "currency",
        currency: "ILS",
        maximumFractionDigits: 0,
      }),
    []
  );

  const closeMenu = () => setOpenIdx(null);

  const openMenuFor = (index) => {
    if (openIdx === index) return closeMenu();
    setOpenIdx(index);

    const btn = btnRefs.current[index];
    if (btn) {
      const r = btn.getBoundingClientRect();
      setMenuPos({
        top: r.bottom,
        right: window.innerWidth - r.right,
      });
    }
  };

  // click outside + ESC
  useEffect(() => {
    const onDocClick = (e) => {
      if (openIdx === null) return;
      const btn = btnRefs.current[openIdx];
      if (btn && (btn === e.target || btn.contains(e.target))) return;
      closeMenu();
    };
    const onKey = (e) => e.key === "Escape" && closeMenu();

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openIdx]);

  // keep aligned on resize/orientation, close on scroll
  useEffect(() => {
    if (openIdx === null) return;
    const handleResize = () => {
      const btn = btnRefs.current[openIdx];
      if (!btn) return closeMenu();
      const r = btn.getBoundingClientRect();
      setMenuPos({ top: r.bottom, right: window.innerWidth - r.right });
    };
    const handleScroll = () => closeMenu();

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("orientationchange", handleResize, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [openIdx]);

  return (
    <div className="products-courses-table-wrapper">
      <table className="products-courses-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>SKU</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Status</th>
            <th aria-label="Actions" className="actions-col">Actions</th>
          </tr>
        </thead>

        <tbody>
          {!products || products.length === 0 ? (
            <tr>
              <td colSpan="7" className="no-data">No products found</td>
            </tr>
          ) : (
            products.map((p, i) => {
              const img = getProductImage(p);
              const alt = p?.image?.alt || p?.name || "product";
              return (
                <tr key={p._id || i}>
                  {/* Name with thumbnail (desktop); becomes card header on mobile */}
                  <td data-label="Name" className="cell-title name-cell">
                    <span className="name-cell-inner">
                      <span className="name-thumb">
                        {img ? (
                          <img src={img} alt={alt} loading="lazy" />
                        ) : (
                          <span className="thumb-placeholder" aria-hidden="true">📦</span>
                        )}
                      </span>
                      <span className="name-text">{p.name}</span>
                    </span>
                  </td>

                  <td data-label="SKU">{p.sku || "—"}</td>
                  <td data-label="Category">{p.category || "—"}</td>
                  <td data-label="Price">{fmt.format(Number(p.price) || 0)}</td>
                  <td data-label="Stock">
                    {p.stock ?? 0}
                    {(p.reorderLevel ?? 0) >= 0 &&
                      (p.stock ?? 0) <= (p.reorderLevel ?? 0) && (
                        <span className="stock-badge low" title="At or below reorder level">
                          Low
                        </span>
                      )}
                  </td>
                  <td data-label="Status">
                    <span
                      className={`status-badge ${
                        p.status === "archived" ? "archived" : "active"
                      }`}
                    >
                      {p.status || "active"}
                    </span>
                  </td>

                  <td className="actions-cell" data-label="Actions">
                    <button
                      className="dots-btn"
                      ref={(el) => (btnRefs.current[i] = el)}
                      onClick={() => openMenuFor(i)}
                      aria-haspopup="menu"
                      aria-expanded={openIdx === i}
                      title="Actions"
                    >
                      ⋮
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Portal menu (fixed; doesn't affect row height) */}
      {openIdx !== null &&
        createPortal(
          <div
            className="dropdown-menu"
            role="menu"
            style={{
              position: "fixed",
              top: `${menuPos.top}px`,
              right: `${menuPos.right}px`,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button role="menuitem" onClick={() => { onView(products[openIdx]); closeMenu(); }}>
              👁 View
            </button>
            <button role="menuitem" onClick={() => { onEdit(products[openIdx]); closeMenu(); }}>
              ✏️ Edit
            </button>
            <button role="menuitem" onClick={() => { onDelete(products[openIdx]._id); closeMenu(); }}>
              🗑 Delete
            </button>
            <button role="menuitem" className="close-btn" onClick={closeMenu}>
              ❌ Close
            </button>
          </div>,
          document.body
        )}
    </div>
  );
};

export default ProductsTable;