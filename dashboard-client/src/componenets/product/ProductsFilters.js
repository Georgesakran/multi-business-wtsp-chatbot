import React from "react";
import "../course/CoursesFilters.css"; // optional, can reuse your cb-* classes

const SORT_OPTIONS = [
  { value: "createdAt_desc", label: "Newest" },
  { value: "createdAt_asc",  label: "Oldest" },
  { value: "name_asc",       label: "Name A–Z" },
  { value: "name_desc",      label: "Name Z–A" },
  { value: "price_asc",      label: "Price ↑" },
  { value: "price_desc",     label: "Price ↓" },
  { value: "stock_asc",      label: "Stock ↑" },
  { value: "stock_desc",     label: "Stock ↓" },
];

const ProductsFilters = ({
  // DRAFT state + setters
  qDraft, setQDraft,
  skuDraft, setSkuDraft,
  categoryDraft, setCategoryDraft,
  statusDraft, setStatusDraft,
  priceMinDraft, setPriceMinDraft,
  priceMaxDraft, setPriceMaxDraft,
  stockMinDraft, setStockMinDraft,
  stockMaxDraft, setStockMaxDraft,
  sortByDraft, setSortByDraft,
  pending,
  onApply, onReset,
}) => {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onApply?.();
    }
  };

  return (
    <section className="cb-filters" aria-label="filters" onKeyDown={handleKeyDown}>
      {/* Row 1 */}
      <div className="cb-row">
        <div className="cb-field cb-field--grow">
          <label htmlFor="q">Search</label>
          <input
            id="q" type="search" placeholder="Name/description…"
            value={qDraft} onChange={(e)=>setQDraft(e.target.value)}
          />
        </div>

        <div className="cb-field">
          <label htmlFor="sku">SKU</label>
          <input id="sku" value={skuDraft} onChange={(e)=>setSkuDraft(e.target.value)} />
        </div>

        <div className="cb-field">
          <label htmlFor="category">Category</label>
          <input id="category" value={categoryDraft} onChange={(e)=>setCategoryDraft(e.target.value)} />
        </div>
      </div>  



      {/* Row 2 */}
      <div className="cb-row">

        <div className="cb-field">
          <label>Min Price</label>
          <input type="number" min="0" placeholder="0" value={priceMinDraft} onChange={(e)=>setPriceMinDraft(e.target.value)} />
        </div>

        <div className="cb-field">
          <label>Max Price</label>
          <input type="number" min="0" placeholder="9999" value={priceMaxDraft} onChange={(e)=>setPriceMaxDraft(e.target.value)} />
        </div>


        <div className="cb-field">
          <label>Min Stock</label>
          <input type="number" min="0" placeholder="0" value={stockMinDraft} onChange={(e)=>setStockMinDraft(e.target.value)} />
        </div>
        <div className="cb-field">
          <label>Max Stock</label>
          <input type="number" min="0" placeholder="9999" value={stockMaxDraft} onChange={(e)=>setStockMaxDraft(e.target.value)} />
        </div>


      </div>
      {/* Row 3 */}
      <div className="cb-row">
        <div className="cb-field">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={statusDraft}
            onChange={(e)=>setStatusDraft(e.target.value)}
          >
            <option value="any">Any</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="cb-field">
          <label htmlFor="sort">Sort</label>
          <select
            id="sort"
            value={sortByDraft}
            onChange={(e)=>setSortByDraft(e.target.value)}
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="cb-actions">
          {pending && (
             <span id="filters-pending-hint" className="filters-hint">
             You have unapplied filter changes.
           </span>
         )}
          <button type="button" className="btn ghost" onClick={onReset}>Reset</button>
          <button type="button" className={`btn primary ${pending ? "pending" : ""}`} onClick={onApply}>
            Apply
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProductsFilters;