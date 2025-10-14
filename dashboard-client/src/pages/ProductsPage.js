import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../services/api";
import ProductsTable from "../componenets/product/ProductsTable";
import ProductsFilters from "../componenets/product/ProductsFilters";
import ProductFormModal from "../componenets/product/ProductFormModal";
import ProductsFilterChips from "../componenets/product/ProductsFilterChips"; 
import ProductViewModal from "../componenets/product/ProductViewModal";
import { toast } from "react-toastify";
import "../styles/ProductsPage.css";

const PAGE_SIZE = 10;

const safeGetUser = () => {
  try { const raw = localStorage.getItem("user"); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
};

const ProductsPage = () => {
  const user = safeGetUser();
  const businessId = user?.businessId ?? null;

  // data
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  

  // DRAFT
  const [qDraft, setQDraft] = useState("");
  const [skuDraft, setSkuDraft] = useState("");
  const [categoryDraft, setCategoryDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState("any");
  const [priceMinDraft, setPriceMinDraft] = useState("");
  const [priceMaxDraft, setPriceMaxDraft] = useState("");
  const [stockMinDraft, setStockMinDraft] = useState("");
  const [stockMaxDraft, setStockMaxDraft] = useState("");
  const [sortByDraft, setSortByDraft] = useState("createdAt_desc");

  // APPLIED
  const [q, setQ] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("any");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [stockMin, setStockMin] = useState("");
  const [stockMax, setStockMax] = useState("");
  const [sortBy, setSortBy] = useState("createdAt_desc");
  const [page, setPage] = useState(1);

  const hasPending =
    qDraft !== q ||
    skuDraft !== sku ||
    categoryDraft !== category ||
    statusDraft !== status ||
    priceMinDraft !== priceMin ||
    priceMaxDraft !== priceMax ||
    stockMinDraft !== stockMin ||
    stockMaxDraft !== stockMax ||
    sortByDraft !== sortBy;

  // INIT from URL
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const initial = {
      q: p.get("q") || "",
      sku: p.get("sku") || "",
      category: p.get("category") || "",
      status: p.get("status") || "any",
      priceMin: p.get("priceMin") || "",
      priceMax: p.get("priceMax") || "",
      stockMin: p.get("stockMin") || "",
      stockMax: p.get("stockMax") || "",
      sortBy: p.get("sortBy") || "createdAt_desc",
      page: Number(p.get("page") || 1),
    };

    // applied
    setQ(initial.q); setSku(initial.sku); setCategory(initial.category); setStatus(initial.status);
    setPriceMin(initial.priceMin); setPriceMax(initial.priceMax);
    setStockMin(initial.stockMin); setStockMax(initial.stockMax);
    setSortBy(initial.sortBy); setPage(initial.page);

    // drafts
    setQDraft(initial.q); setSkuDraft(initial.sku); setCategoryDraft(initial.category); setStatusDraft(initial.status);
    setPriceMinDraft(initial.priceMin); setPriceMaxDraft(initial.priceMax);
    setStockMinDraft(initial.stockMin); setStockMaxDraft(initial.stockMax);
    setSortByDraft(initial.sortBy);
  }, []);

  // URL sync
  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (sku) p.set("sku", sku);
    if (category) p.set("category", category);
    if (status !== "any") p.set("status", status);
    if (priceMin) p.set("priceMin", priceMin);
    if (priceMax) p.set("priceMax", priceMax);
    if (stockMin) p.set("stockMin", stockMin);
    if (stockMax) p.set("stockMax", stockMax);
    if (sortBy !== "createdAt_desc") p.set("sortBy", sortBy);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    const clean = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", clean);
  }, [q, sku, category, status, priceMin, priceMax, stockMin, stockMax, sortBy, page]);


    useEffect(() => {
      if (mobileFiltersOpen) {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
      }
    }, [mobileFiltersOpen])

  const params = useMemo(() => ({
    businessId,
    q: q || undefined,
    sku: sku || undefined,
    category: category || undefined,
    status: status !== "any" ? status : undefined,
    priceMin: priceMin || undefined,
    priceMax: priceMax || undefined,
    stockMin: stockMin || undefined,
    stockMax: stockMax || undefined,
    sortBy,
    page,
    limit: PAGE_SIZE
  }), [businessId, q, sku, category, status, priceMin, priceMax, stockMin, stockMax, sortBy, page]);

  const handleApply = () => {
    if (priceMinDraft && priceMaxDraft && Number(priceMinDraft) > Number(priceMaxDraft)) {
      const t = priceMinDraft; setPriceMinDraft(priceMaxDraft); setPriceMaxDraft(t);
    }
    if (stockMinDraft && stockMaxDraft && Number(stockMinDraft) > Number(stockMaxDraft)) {
      const t = stockMinDraft; setStockMinDraft(stockMaxDraft); setStockMaxDraft(t);
    }
    setQ(qDraft.trim());
    setSku(skuDraft.trim());
    setCategory(categoryDraft.trim());
    setStatus(statusDraft);
    setPriceMin(priceMinDraft); setPriceMax(priceMaxDraft);
    setStockMin(stockMinDraft); setStockMax(stockMaxDraft);
    setSortBy(sortByDraft);
    setPage(1);
  };

  const handleReset = () => {
    setQDraft(""); setSkuDraft(""); setCategoryDraft(""); setStatusDraft("any");
    setPriceMinDraft(""); setPriceMaxDraft(""); setStockMinDraft(""); setStockMaxDraft("");
    setSortByDraft("createdAt_desc");

    setQ(""); setSku(""); setCategory(""); setStatus("any");
    setPriceMin(""); setPriceMax(""); setStockMin(""); setStockMax("");
    setSortBy("createdAt_desc"); setPage(1);
  };

  const fetchProducts = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const { data } = await axios.get("/products", { params });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("❌ Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [businessId, params]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleDelete = async (id) => {
    if (!businessId) return toast.error("❌ Missing business ID");
    if (!window.confirm("Delete this product?")) return;
    try {
      await axios.delete(`/products/${id}`, { params: { businessId } });
      toast.success("✅ Product deleted");
      fetchProducts();
    } catch {
      toast.error("❌ Failed to delete product");
    }
  };

  if (!businessId) {
    return (
      <div className="products-page">
        <p style={{ opacity: 0.8 }}>You’re not linked to a business. Please log in again.</p>
      </div>
    );
  }

  return (
    <div className="products-page">
      <div className="products-header">

        {/* Mobile filter trigger */}

        <button
            className="filters-trigger"      // <-- CSS makes this mobile-only
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
        <button className="add-product-btn" onClick={() => { setEditProduct(null); setShowFormModal(true); }}>
          ➕ Add Product
        </button>
      </div>

      <div className="filters-inline">
        <ProductsFilters
          qDraft={qDraft} setQDraft={setQDraft}
          skuDraft={skuDraft} setSkuDraft={setSkuDraft}
          categoryDraft={categoryDraft} setCategoryDraft={setCategoryDraft}
          statusDraft={statusDraft} setStatusDraft={setStatusDraft}
          priceMinDraft={priceMinDraft} setPriceMinDraft={setPriceMinDraft}
          priceMaxDraft={priceMaxDraft} setPriceMaxDraft={setPriceMaxDraft}
          stockMinDraft={stockMinDraft} setStockMinDraft={setStockMinDraft}
          stockMaxDraft={stockMaxDraft} setStockMaxDraft={setStockMaxDraft}
          sortByDraft={sortByDraft} setSortByDraft={setSortByDraft}
          pending={hasPending}
          onApply={handleApply}
          onReset={handleReset}
        />
      </div>


      {/* If you use chips, they should reflect APPLIED values */}
      <ProductsFilterChips
        q={q}             onQ={(v)=>{ setQ(v); setQDraft(v); setPage(1); }}
        sku={sku}         onSku={(v)=>{ setSku(v); setSkuDraft(v); setPage(1); }}
        category={category} onCategory={(v)=>{ setCategory(v); setCategoryDraft(v); setPage(1); }}
        priceMin={priceMin} onPriceMin={(v)=>{ setPriceMin(v); setPriceMinDraft(v); setPage(1); }}
        priceMax={priceMax} onPriceMax={(v)=>{ setPriceMax(v); setPriceMaxDraft(v); setPage(1); }}
        stockMin={stockMin} onStockMin={(v)=>{ setStockMin(v); setStockMinDraft(v); setPage(1); }}
        stockMax={stockMax} onStockMax={(v)=>{ setStockMax(v); setStockMaxDraft(v); setPage(1); }}
        status={status}     onStatus={(v)=>{ setStatus(v); setStatusDraft(v); setPage(1); }}
        sortBy={sortBy}     onSortBy={(v)=>{ setSortBy(v); setSortByDraft(v); setPage(1); }}
        onClearAll={handleReset}
      />

      {/* Results: TABLE ONLY */}
      {loading ? (
        <div className="products-loading" aria-busy="true"></div>
      ) : items.length === 0 ? (
        <div className="products-empty">
            <p>No products match your filters.</p>
            <button 
                className="add-product-btn" 
                onClick={() => { setEditProduct(null); setShowFormModal(true); }}
            >
                ➕ Add your first product
            </button>
        </div>
      ) : (
        <>
            <ProductsTable
            products={items}
            onView={(p) => setViewProduct(p)}
            onEdit={(p) => { setEditProduct(p); setShowFormModal(true); }}
            onDelete={(id )=> handleDelete(id)}
            />

            {/* Pagination (uses totalPages -> no warning) */}
          <div className="cb-pagination" role="navigation" aria-label="pagination" style={{ marginTop: 12 }}>
            <button
              className="cb-page-btn"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              ‹ Prev
            </button>
            <span className="cb-page-indicator">Page {page} of {totalPages}</span>
            <button
              className="cb-page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Next ›
            </button>
          </div>
        </>
      )}

      {mobileFiltersOpen && (
        <div
          className="filters-sheet"
          role="dialog"
        >
          <div className="filters-panel" role="document">
            <div className="filters-panel-header">
              <h3 id="filters-title">Filters</h3>
              <button
                className="icon-btn"
                aria-label="Close filters"
                onClick={() => setMobileFiltersOpen(false)}
              >
                ✕
              </button>
            </div>


            <div className="filters-panel-body">
              {/* Reuse the SAME component inside the sheet */}
              <ProductsFilters
                qDraft={qDraft} setQDraft={setQDraft}
                skuDraft={skuDraft} setSkuDraft={setSkuDraft}
                categoryDraft={categoryDraft} setCategoryDraft={setCategoryDraft}
                statusDraft={statusDraft} setStatusDraft={setStatusDraft}
                priceMinDraft={priceMinDraft} setPriceMinDraft={setPriceMinDraft}
                priceMaxDraft={priceMaxDraft} setPriceMaxDraft={setPriceMaxDraft}
                stockMinDraft={stockMinDraft} setStockMinDraft={setStockMinDraft}
                stockMaxDraft={stockMaxDraft} setStockMaxDraft={setStockMaxDraft}
                sortByDraft={sortByDraft} setSortByDraft={setSortByDraft}
                pending={hasPending}
                onApply={() => { handleApply(); setMobileFiltersOpen(false); }}
                onReset={handleReset}
                />
            </div>
          </div>
        </div>
      )}

      {showFormModal && (
        <ProductFormModal
          businessId={businessId}
          existingProduct={editProduct}
          onClose={() => setShowFormModal(false)}
          onProductSaved={fetchProducts}
        />
      )}
      {viewProduct && (
        <ProductViewModal product={viewProduct} onClose={() => setViewProduct(null)} />
      )}
    </div>
  );
};

export default ProductsPage;