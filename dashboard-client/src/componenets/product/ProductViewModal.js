import React, { useEffect, useRef } from "react";
import "./ProductViewModal.css";

const currency = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});

const ProductViewModal = ({ product, onClose }) => {
  const modalRef = useRef(null);

  // Close on ESC + focus trap
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();

      if (e.key === "Tab" && modalRef.current) {
        const nodes = modalRef.current.querySelectorAll(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus(); e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus(); e.preventDefault();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Early out (no hooks below this line)
  if (!product) return null;

  // Money + status
  const price = Number(product?.price || 0);
  const cost = Number(product?.cost || 0);
  const margin = price - cost;
  const marginPct = price > 0 ? Math.round((margin / price) * 100) : 0;
  const lowStock =
    (product?.reorderLevel ?? 0) >= 0 &&
    (product?.stock ?? 0) <= (product?.reorderLevel ?? 0);
  const status = (product?.status || "active").toLowerCase();
  const statusLabel = status === "archived" ? "Archived" : "Active";

  // ----- Image URL selection (robust) -----
  const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME; // set in your .env
  const directUrl =
    product?.image?.secure_url ||
    product?.image?.url ||
    product?.imageUrl || // legacy fallback if you ever stored it flat
    null;

  const publicId = product?.image?.public_id || null;

  // If we only have a Cloudinary public_id, build a delivery URL
  const builtUrl =
    !directUrl && publicId && cloudName
      ? `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/${publicId}`
      : null;

  const imgSrc = directUrl || builtUrl;
  const imageAlt =
    product?.image?.alt || product?.name || "product";

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      className="product-view-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-view-title"
      onMouseDown={handleOverlayClick}
    >
      <div className="product-view-container" ref={modalRef}>
        <header className="product-view-header">
          <h3 id="product-view-title">🧾 {product.name}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="product-view-content">
          {/* Image + basic meta */}
          <div className="pv-top">
            <div className="pv-image">
              {imgSrc ? (
                <img src={imgSrc} alt={imageAlt} loading="lazy" />
              ) : (
                <div className="pv-image--placeholder" aria-hidden="true">
                  No Image
                </div>
              )}
            </div>

            <div className="pv-meta">
              <div>
                <strong>SKU:</strong> {product.sku || "—"}
              </div>
              <div>
                <strong>Category:</strong> {product.category || "—"}
              </div>
              <div>
                <strong>Status:</strong>{" "}
                <span
                  className={`status-badge ${
                    status === "archived" ? "archived" : "active"
                  }`}
                >
                  {statusLabel}
                </span>
              </div>
              {lowStock && <span className="stock-badge low">⚠ Low stock</span>}
            </div>
          </div>

          {/* Money */}
          <div className="pv-money">
            <div>
              <strong>Price:</strong> {currency.format(price)}
            </div>
            <div>
              <strong>Cost:</strong> {currency.format(cost)}
            </div>
            <div>
              <strong>Margin:</strong> {currency.format(margin)}{" "}
              <span className={`margin-pill ${margin >= 0 ? "pos" : "neg"}`}>
                {marginPct}%
              </span>
            </div>
          </div>

          {/* Stock */}
          <div className="pv-stock">
            <div>
              <strong>Stock:</strong> {product.stock ?? 0}
            </div>
            <div>
              <strong>Reorder level:</strong> {product.reorderLevel ?? 0}
            </div>
          </div>

          {/* Description */}
          <div className="pv-desc">
            <strong>Description:</strong>
            <p>{product.description || "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductViewModal;