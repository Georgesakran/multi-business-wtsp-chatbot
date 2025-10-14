import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";
import { toast } from "react-toastify";

const ProductFormModal = ({
  businessId,
  onClose,
  onProductSaved,
  onProductAdded,
  existingProduct,
}) => {
  // form state
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [status, setStatus] = useState("active");
  const [description, setDescription] = useState("");

  // image state
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [uploading, setUploading] = useState(false);

  // did the user explicitly remove the existing image?
  const [removeExistingImage, setRemoveExistingImage] = useState(false);

  // validation state
  const [errors, setErrors] = useState({});

  // focus trap anchors
  const modalRef = useRef(null);
  const firstFocusableRef = useRef(null);
  const lastFocusableRef = useRef(null);

  // file input ref (so “Replace” can trigger it)
  const fileInputRef = useRef(null);

  // hydrate on open/edit
  useEffect(() => {
    if (existingProduct) {
      setName(existingProduct.name || "");
      setSku(existingProduct.sku || "");
      setCategory(existingProduct.category || "");
      setPrice(existingProduct.price ?? "");
      setCost(existingProduct.cost ?? "");
      setStock(existingProduct.stock ?? "");
      setReorderLevel(existingProduct.reorderLevel ?? "");
      setStatus((existingProduct.status || "active").toLowerCase()); // 👈 FIXED
      setDescription(existingProduct.description || "");
  
      setImageUrl(existingProduct.image?.url || "");
      setImageAlt(existingProduct.image?.alt || "");
      setRemoveExistingImage(false);
    } else {
      setName("");
      setSku("");
      setCategory("");
      setPrice("");
      setCost("");
      setStock("");
      setReorderLevel("");
      setStatus("active");
      setDescription("");
      setImageUrl("");
      setImageAlt("");
      setRemoveExistingImage(false);
    }
    setErrors({});
  }, [existingProduct]);
  

  // lock background scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ESC to close + focus trap
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus(); e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus(); e.preventDefault();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // autofocus first field
  useEffect(() => {
    firstFocusableRef.current?.focus();
  }, []);

  // overlay click should close (only when clicking the overlay itself)
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  // ---------- image upload ----------
  const onPickImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      toast.error("Please choose an image file.");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large (max 5MB).");
      e.target.value = "";
      return;
    }

    try {
      setUploading(true);
      const form = new FormData();
      form.append("image", file);

      const { data } = await api.post("/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!data?.url) throw new Error("No URL returned from upload");
      // new image selected → we’re not “removing” anymore
      setRemoveExistingImage(false);
      setImageUrl(data.url);
      toast.success("Image uploaded");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
      e.target.value = ""; // allow picking the same file again
    }
  };

  const triggerReplace = () => fileInputRef.current?.click();

  const removeImage = () => {
    // If editing and an image existed, mark deletion.
    if (existingProduct?.image?.url) setRemoveExistingImage(true);
    setImageUrl("");
    setImageAlt("");
  };

  // ---------- validation ----------
  const validate = () => {
    const next = {};
    if (!name.trim()) next.name = "Required";

    const n = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
    const nPrice = n(price);
    const nCost = n(cost);
    const nStock = n(stock);
    const nReorder = n(reorderLevel);

    if (nPrice !== null && (Number.isNaN(nPrice) || nPrice < 0)) next.price = "Must be ≥ 0";
    if (nCost !== null && (Number.isNaN(nCost) || nCost < 0)) next.cost = "Must be ≥ 0";
    if (nStock !== null && (Number.isNaN(nStock) || nStock < 0)) next.stock = "Must be ≥ 0";
    if (nReorder !== null && (Number.isNaN(nReorder) || nReorder < 0)) next.reorderLevel = "Must be ≥ 0";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // payload
  const payload = useMemo(() => {
    // Decide how to send image:
    // - If user pressed “Remove” while editing → send image: null (so backend clears it)
    // - Else if we have imageUrl → send the object
    // - Else → omit (no change)
    let imageField;
    if (removeExistingImage && existingProduct?._id) {
      imageField = null;
    } else if (imageUrl) {
      imageField = { url: imageUrl, alt: imageAlt.trim() };
    }

    const base = {
      businessId,
      name: name.trim(),
      sku: sku.trim(),
      category: category.trim(),
      price: price === "" ? 0 : Number(price),
      cost: cost === "" ? 0 : Number(cost),
      stock: stock === "" ? 0 : Number(stock),
      reorderLevel: reorderLevel === "" ? 0 : Number(reorderLevel),
      status,
      description: description.trim(),
    };

    return imageField === undefined ? base : { ...base, image: imageField };
  }, [
    businessId, name, sku, category, price, cost, stock, reorderLevel, status, description,
    imageUrl, imageAlt, removeExistingImage, existingProduct?._id
  ]);

  // submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    if (!businessId) {
      toast.error("Missing business ID.");
      return;
    }
    if (uploading) {
      toast.info("Please wait for the image to finish uploading.");
      return;
    }

    try {
      if (existingProduct?._id) {
        await api.put(`/products/${existingProduct._id}`, payload);
        toast.success("✅ Product updated");
      } else {
        await api.post("/products", payload);
        toast.success("✅ Product created");
      }
      onProductSaved?.();
      onProductAdded?.();
      onClose?.();
    } catch (err) {
      const msg = err?.response?.data?.message || "❌ Failed to save product";
      toast.error(msg);
    }
  };

  return (
    <div
      className="modal-overlay-add-edit-course-product"
      onMouseDown={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="product-modal-title"
    >
      <div className="modal-container" ref={modalRef}>
        <header className="modal-header">
          <h3 id="product-modal-title">
            {existingProduct ? "✏️ Edit Product" : "🛍️ Add New Product"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="icon-btn"
            aria-label="Close"
            ref={lastFocusableRef}
          >
            ✖
          </button>
        </header>

        <form className="modal-content-course-product-form" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            {/* Name */}
            <div className="form-field form-field--full">
              <label htmlFor="pf-name">Name*</label>
              <input
                id="pf-name"
                ref={firstFocusableRef}
                type="text"
                value={name}
                onChange={(e)=>setName(e.target.value)}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "err-name" : undefined}
                placeholder="e.g., Hyaluronic Acid Serum 30ml"
                required
              />
              {errors.name && <p id="err-name" className="error">{errors.name}</p>}
            </div>

            {/* SKU & Category */}
            <div className="form-field">
              <label htmlFor="pf-sku">SKU</label>
              <input id="pf-sku" type="text" value={sku} onChange={(e)=>setSku(e.target.value)} placeholder="e.g., HA-30-001" />
              {errors.sku && <p className="error">{errors.sku}</p>}
            </div>

            <div className="form-field">
              <label htmlFor="pf-category">Category</label>
              <input id="pf-category" type="text" value={category} onChange={(e)=>setCategory(e.target.value)} placeholder="e.g., Skin Care" />
              {errors.category && <p className="error">{errors.category}</p>}
            </div>

            {/* Price & Cost */}
            <div className="form-field">
              <label htmlFor="pf-price">Price (₪)</label>
              <input id="pf-price" type="number" min="0" inputMode="decimal" value={price} onChange={(e)=>setPrice(e.target.value)}
                     aria-invalid={!!errors.price} aria-describedby={errors.price ? "err-price" : undefined} placeholder="e.g., 129" />
              {errors.price && <p id="err-price" className="error">{errors.price}</p>}
            </div>

            <div className="form-field">
              <label htmlFor="pf-cost">Cost (₪)</label>
              <input id="pf-cost" type="number" min="0" inputMode="decimal" value={cost} onChange={(e)=>setCost(e.target.value)}
                     aria-invalid={!!errors.cost} aria-describedby={errors.cost ? "err-cost" : undefined} placeholder="e.g., 54" />
              {errors.cost && <p id="err-cost" className="error">{errors.cost}</p>}
            </div>

            {/* Stock & Reorder */}
            <div className="form-field">
              <label htmlFor="pf-stock">Stock</label>
              <input id="pf-stock" type="number" min="0" value={stock} onChange={(e)=>setStock(e.target.value)}
                     aria-invalid={!!errors.stock} aria-describedby={errors.stock ? "err-stock" : undefined} placeholder="e.g., 25" />
              {errors.stock && <p id="err-stock" className="error">{errors.stock}</p>}
            </div>

            <div className="form-field">
              <label htmlFor="pf-reorder">Reorder level</label>
              <input id="pf-reorder" type="number" min="0" value={reorderLevel} onChange={(e)=>setReorderLevel(e.target.value)}
                     aria-invalid={!!errors.reorderLevel} aria-describedby={errors.reorderLevel ? "err-reorder" : undefined} placeholder="e.g., 5" />
              {errors.reorderLevel && <p id="err-reorder" className="error">{errors.reorderLevel}</p>}
            </div>

            {/* Status */}
            <div className="form-field">
              <label htmlFor="pf-status">Status</label>
              <select id="pf-status" value={status} onChange={(e)=>setStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Image */}
            <div className="form-field form-field--full">
              <label>Product Image</label>

              <div className="pf-image-toolbar">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onPickImage}
                  disabled={uploading}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  className="btn"
                  onClick={triggerReplace}
                  disabled={uploading}
                >
                  {imageUrl ? "Replace photo" : "Upload photo"}
                </button>
                {imageUrl && (
                  <button type="button" className="btn danger" onClick={removeImage} disabled={uploading}>
                    Remove photo
                  </button>
                )}
              </div>

              {imageUrl && (
                <div className="pf-image-preview">
                  <img src={imageUrl} alt={imageAlt || "product"} />
                </div>
              )}
            </div>

            {/* Description */}
            <div className="form-field form-field--full">
              <label htmlFor="pf-desc">Description</label>
              <textarea id="pf-desc" rows={4} value={description} onChange={(e)=>setDescription(e.target.value)}
                        placeholder="Notes, ingredients, instructions..." />
              {errors.description && <p className="error">{errors.description}</p>}
            </div>
          </div>

          {/* actions */}
          <div className="modal-courses-btns-actions">
            <button type="button" className="cancel-btn-course-page" onClick={onClose} aria-label="Cancel">
              Cancel
            </button>
            <button className="submit-btn-course-page" ref={lastFocusableRef} disabled={uploading}>
              {existingProduct ? (uploading ? "Uploading…" : "✅ Save Changes") : (uploading ? "Uploading…" : "✅ Create Product")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;