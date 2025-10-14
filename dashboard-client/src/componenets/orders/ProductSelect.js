// src/componenets/orders/ProductSelect.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api from "../../services/api";
import "./ProductSelect.css"; // keep your existing css if you already have it

/**
 * Props:
 * - businessId (required)
 * - value: currently selected product object or null
 * - onChange(product|null)
 * - placeholder?: string
 */
export default function ProductSelect({
  businessId,
  value,
  onChange,
  placeholder = "Search products…",
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [highlight, setHighlight] = useState(0);

  const inputRef = useRef(null);
  const anchorRef = useRef(null);
  const rootRef = useRef(null);

  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 280 });

  // util: image helper
  function SafeImg({ src, alt }) {
    const [ok, setOk] = React.useState(Boolean(src));
    if (!src || !ok) return <span aria-hidden="true">🖼️</span>;
    return <img src={src} alt={alt || "product"} onError={() => setOk(false)} />;
  }
  const thumbUrl = (p) =>
    p?.image?.secure_url || p?.image?.url || p?.imageUrl || null;

  // fetch when open / q changes
  useEffect(() => {
    if (!open || !businessId) return;
    const handle = setTimeout(async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/products", {
          params: {
            businessId,
            q: q || undefined,
            status: "active",
            limit: 10,
            sortBy: "name_asc",
          },
        });
        setItems(data?.items || []);
        setHighlight(0);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [open, q, businessId]);

  // helper: collect scrollable ancestors to listen to their scroll
  const getScrollParents = (el) => {
    const res = [];
    let node = el?.parentElement || null;
    while (node && node !== document.body) {
      const style = window.getComputedStyle(node);
      const overflowY = style.overflowY;
      const overflowX = style.overflowX;
      const isScrollable =
        /(auto|scroll|overlay)/.test(overflowY) ||
        /(auto|scroll|overlay)/.test(overflowX);
      if (isScrollable) res.push(node);
      node = node.parentElement;
    }
    return res;
  };

  // open & position (use viewport coords; menu will be position: fixed)
  const openMenu = () => {
    setOpen(true);
    queueMicrotask(() => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (r) setMenuPos({ top: r.bottom, left: r.left, width: r.width });
    });
  };

  // keep aligned while scrolling/resizing (window + scroll parents)
  useEffect(() => {
    if (!open) return;

    const align = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (r) setMenuPos({ top: r.bottom, left: r.left, width: r.width });
    };

    const parents = getScrollParents(anchorRef.current);
    parents.forEach((p) => p.addEventListener("scroll", align, { passive: true }));
    window.addEventListener("resize", align, { passive: true });
    window.addEventListener("orientationchange", align, { passive: true });
    // align immediately in case layout changed after opening
    align();

    return () => {
      parents.forEach((p) => p.removeEventListener("scroll", align));
      window.removeEventListener("resize", align);
      window.removeEventListener("orientationchange", align);
    };
  }, [open]);

  // outside / esc / arrows / enter
  useEffect(() => {
    const onDoc = (e) => {
      if (!open) return;
      if (rootRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowDown") {
        setHighlight((h) => Math.min(h + 1, Math.max(0, items.length - 1)));
        e.preventDefault();
      }
      if (e.key === "ArrowUp") {
        setHighlight((h) => Math.max(h - 1, 0));
        e.preventDefault();
      }
      if (e.key === "Enter") {
        const picked = items[highlight];
        if (picked) {
          onChange?.(picked);
          setOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, items, highlight, onChange]);

  const clear = (e) => {
    e?.stopPropagation();
    onChange?.(null);
    setQ("");
    inputRef.current?.focus();
  };

  const Menu = (
    <>
      {/* optional click blocker */}
      <div
        className="psel-overlay"
        onMouseDown={() => setOpen(false)}

      />
      <div
        className="psel-menu"
        style={{
          position: "fixed",
          top: menuPos.top,
          left: menuPos.left,
          width: menuPos.width,
          maxHeight: 320,
          overflow: "hidden",
          zIndex: 9999,
          background: "#fff",
          borderRadius: 10,
          border: "1px solid #ececec",
          boxShadow: "0 10px 30px rgba(0,0,0,.15)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Products"
      >

        <MenuList
          items={items}
          loading={loading}
          highlight={highlight}
          setHighlight={setHighlight}
          onPick={(p) => {
            onChange?.(p);
            setOpen(false);
          }}
        />
      </div>
    </>
  );

  // selected (chip)
  if (value) {
    return (
      <div className="psel-root" ref={rootRef} data-open={open ? "true" : "false"}>
        <div className="psel-chip" ref={anchorRef} >
          <div className="psel-chip-left" >
            <div className="psel-thumb" >
              <SafeImg src={thumbUrl(value)} alt={value.name} />
            </div>
            <div className="psel-info" >
              <div className="psel-name" title={value.name}>
                {value.name}
              </div>
              <div className="psel-sub" >
                {value.sku ? <span>SKU: {value.sku}</span> : <span>—</span>} • {Number(value.price || 0).toFixed(0)}₪
              </div>
            </div>
          </div>
          <div className="psel-chip-actions" >
            <button type="button" className="psel-btn" onClick={openMenu}>Change</button>
            <button type="button" className="psel-btn danger" onClick={clear}>Remove</button>
          </div>
        </div>
        {open && createPortal(Menu, document.body)}
      </div>
    );
  }

  // no selection
  return (
    <div className="psel-root" ref={rootRef} data-open={open ? "true" : "false"}>
      <div className="psel-anchor" ref={anchorRef} onMouseDown={(e) => e.stopPropagation()}>
        <div className="psel-input" onClick={openMenu}>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (!open) openMenu();
            }}
            placeholder={placeholder}
            aria-label="Search products"
            
          />
          <span className="psel-icon">🔎</span>
        </div>
      </div>
      {open && createPortal(Menu, document.body)}
    </div>
  );
}

function MenuList({ items, loading, highlight, setHighlight, onPick }) {
  const fmt = useMemo(
    () =>
      new Intl.NumberFormat("he-IL", {
        style: "currency",
        currency: "ILS",
        maximumFractionDigits: 0,
      }),
    []
  );
  if (loading)
    return (
      <div className="psel-list">
        <div className="psel-empty">
          Loading…
        </div>
      </div>
    );
  if (!items.length)
    return (
      <div className="psel-list">
        <div className="psel-empty">
          No products
        </div>
      </div>
    );

  const img = (p) => p?.image?.secure_url || p?.image?.url || p?.imageUrl || null;

  return (
    <ul className="psel-list" role="listbox" style={{ listStyle: "none", margin: 0, padding: 8 }}>
      {items.map((p, i) => (
        <li
          key={p._id || i}
          className={`psel-item ${highlight === i ? "is-active" : ""}`}
          role="option"
          onMouseEnter={() => setHighlight(i)}
          onClick={() => onPick(p)}
        >
          <div
            className="psel-thumb"
          >
            {img(p) ? <img src={img(p)} alt={p.name} /> : <span>🖼️</span>}
          </div>
          <div className="psel-info" >
            <div
              className="psel-name"
              title={p.name}
            >
              {p.name}
            </div>
            <div className="psel-sub" >
              {p.sku ? <span>SKU: {p.sku}</span> : <span>—</span>} •{" "}
              {fmt.format(Number(p.price || 0))}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}