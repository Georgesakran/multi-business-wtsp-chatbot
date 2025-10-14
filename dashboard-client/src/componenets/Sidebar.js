import React, { useContext, useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LanguageContext } from "../context/LanguageContext";
import translations from "../translate/translations";
import { getLabelByLang } from "../translate/getLabelByLang";
import ConfirmationModal from "./ConfirmationModal";
import { handleLogout } from "../utils/logout";
import "../styles/Sidebar.css";

/* ---------- utils ---------- */
const safeLabel = (obj, fallback) =>
  obj && typeof obj === "object" ? obj : { en: fallback, he: fallback, ar: fallback };

const useLocalStorage = (key, initial) => {
  const [v, setV] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, setV];
};

/* ---------- data model ---------- */
function buildSections({ role, businessType, t }) {
  // t(...) returns a localized string object -> we pass through and resolve later
  const G = {
    overview: { id: "overview", icon: "🏠", title: safeLabel(t.sidebar?.overviewGroup, "Overview") },
    comms:    { id: "comms",    icon: "💬", title: safeLabel(t.sidebar?.communicationGroup, "Communication") },
    business: { id: "biz",      icon: "🏢", title: safeLabel(t.sidebar?.businessGroup, "Business") },
    booking:  { id: "booking",  icon: "📅", title: safeLabel(t.sidebar?.bookingGroup, "Booking") },
    commerce: { id: "commerce", icon: "🛒", title: safeLabel(t.sidebar?.commerceGroup, "Commerce") },
    admin:    { id: "admin",    icon: "🧠", title: safeLabel(t.sidebar?.adminGroup, "Admin") },
    account:  { id: "account",  icon: "👤", title: safeLabel(t.sidebar?.accountGroup, "Account") },
  };

  const sections = [];

  sections.push({
    ...G.overview,
    items: [
      { to: "/owner/Overview",   icon: "🏠", label: safeLabel(t.sidebar?.overview, "Overview") },
      { to: "/owner/Dashboard",  icon: "📊", label: safeLabel(t.sidebar?.dashboard, "Dashboard") },
    ],
  });

  sections.push({
    ...G.comms,
    items: [
      { to: "/owner/chatbot",       icon: "🤖", label: safeLabel(t.sidebar?.chatbot, "Chatbot") },
      { to: "/owner/conversations", icon: "💬", label: safeLabel(t.sidebar?.conversations, "Conversations") },
      { to: "/owner/faq",           icon: "❓", label: safeLabel(t.sidebar?.qna, "FAQs") },
    ],
  });



  if (["booking", "mixed"].includes(businessType)) {
    sections.push({
      ...G.booking,
      items: [
        { to: "/owner/calendar", icon: "📆", label: safeLabel(t.sidebar?.calendar, "Calendar") },
        { to: "/owner/bookings", icon: "📅", label: safeLabel(t.sidebar?.bookings, "Bookings") },
        { to: "/owner/clients",  icon: "👥", label: safeLabel(t.sidebar?.clients, "Clients") },
        { to: "/owner/services", icon: "💈", label: safeLabel(t.sidebar?.services, "Services") },
        { to: "/owner/courses",  icon: "📚", label: safeLabel(t.sidebar?.courses, "Courses") },
      ],
    });
  }

  if (["product", "mixed"].includes(businessType)) {
    sections.push({
      ...G.commerce,
      items: [
        { to: "/owner/products",     icon: "🛒", label: safeLabel(t.sidebar?.products, "Products") },
        { to: "/owner/orders",       icon: "📦", label: safeLabel(t.sidebar?.orders, "Orders") },
        { to: "/owner/inventory",    icon: "📊", label: safeLabel(t.sidebar?.inventory, "Inventory") },
        { to: "/owner/sales-report", icon: "📈", label: safeLabel(t.sidebar?.salesReport, "Sales Report") },
      ],
    });
  }

  sections.push({
    ...G.business,
    items: [
      { to: "/owner/profile",  icon: "🏢", label: safeLabel(t.sidebar?.businessInfo, "Business Info") },
      { to: "/owner/settings", icon: "⚙️", label: safeLabel(t.sidebar?.settings, "Settings") },
    ],
  });

  if (role === "admin") {
    sections.unshift({
      ...G.admin,
      items: [
        { to: "/admin/Dashboard",   icon: "🧠", label: safeLabel(t.sidebar?.dashboard, "Dashboard") },
        { to: "/admin/businesses",  icon: "🏢", label: safeLabel(t.sidebar?.businesses, "Businesses") },
        { to: "/admin/services",    icon: "🛠️", label: safeLabel(t.sidebar?.allServices, "Services") },
        { to: "/admin/add-business",icon: "➕", label: safeLabel(t.sidebar?.addBusiness, "Add Business") },
      ],
    });
  }

  sections.push({
    ...G.account,
    items: [
      { to: "/logout", icon: "🚪", label: safeLabel(t.sidebar?.logout, "Logout") },
    ],
  });

  return sections;
}

/* ---------- section component ---------- */
function Group({ id, icon, title, items, collapsed, language, expanded, onToggle, onItemClick }) {
  // const labelText = getLabelByLang(title, language);

// inside <Group ...>
return (
  <div className="sidebar-group" data-collapsed={collapsed ? "true" : "false"} data-open={expanded ? "true" : "false"}>
    <button
      className="group-header"
      onClick={() => onToggle(id)}
      aria-expanded={expanded}
      title={collapsed ? getLabelByLang(title, language) : undefined}
    >
      <span className="icon">{icon}</span>
      {!collapsed && <span className="group-title">{getLabelByLang(title, language)}</span>}
      {!collapsed && <span className="chev" aria-hidden>▾</span>}
    </button>

    <div className="group-body" aria-hidden={!expanded}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `sidebar-link sublink ${isActive ? "active" : ""}`}
          onClick={(e) => onItemClick(e, item.to)}
          title={collapsed ? getLabelByLang(item.label, language) : undefined}
        >
          <span className="icon">{item.icon}</span>
          {!collapsed && <span className="label">{getLabelByLang(item.label, language)}</span>}
        </NavLink>
      ))}
    </div>
  </div>
);
}

/* ---------- main ---------- */

export default function Sidebar({ collapsed, setCollapsed, role }) {
  const { language } = useContext(LanguageContext);
  const navigate = useNavigate();

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user")) || null; } catch { return null; }
  }, []);
  const businessType = user?.businessType;

  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({ title: "", message: "", onConfirm: () => {} });

  const [expanded, setExpanded] = useLocalStorage("sb.groups", {
    overview: true,
    comms: false,
    biz: false,
    booking: true,
    commerce: true,
    admin: true,
    account: true,
  });

  const sections = useMemo(
    () => buildSections({ role, businessType, t: translations }),
    [role, businessType]
  );

  useEffect(() => {
    const body = document.body;
    if (window.innerWidth < 768 && !collapsed) body.classList.add("no-scroll");
    else body.classList.remove("no-scroll");
    return () => body.classList.remove("no-scroll");
  }, [collapsed]);

  const handleItemClick = (e, to) => {
    if (to === "/logout") {
      e.preventDefault();
      setModalConfig({
        title: getLabelByLang(translations.modals.logoutTitle, language),
        message: getLabelByLang(translations.modals.logoutMessage, language),
        onConfirm: () => { handleLogout(navigate); setShowModal(false); },
      });
      setShowModal(true);
    } else if (window.innerWidth < 768) {
      setCollapsed(true);
    }
  };

  const toggleGroup = (id) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

  return (
    <>
      {window.innerWidth < 768 && !collapsed && (
        <div className="mobile-sidebar-overlay active" onClick={() => setCollapsed(true)} />
      )}

      <div className={`modern-sidebar ${collapsed ? "collapsed" : ""}`}>
        {/* top strip */}
        <div className="sidebar-top">
          {/* Logo always visible (shrinks when collapsed) */}
          <div className="sidebar-brand" onClick={() => navigate("/owner/Dashboard")} title="Home">
            <img src="/logo_png-noback.png" alt="Logo" />
          </div>
          {/* removed the small header toggle button */}
        </div>

        <nav className="sidebar-menu" role="navigation" aria-label="Main">
          {sections.map((sec) => (
            <Group
              key={sec.id}
              id={sec.id}
              icon={sec.icon}
              title={sec.title}
              items={sec.items}
              collapsed={collapsed}
              language={language}
              expanded={!!expanded[sec.id]}
              onToggle={toggleGroup}
              onItemClick={handleItemClick}
            />
          ))}
        </nav>
      </div>

      {/* Desktop rail + single toggle (kept) */}
      <div className={`sidebar-rail ${collapsed ? "collapsed" : ""}`} aria-hidden="true" />
      <button
        className={`sidebar-rail-toggle ${collapsed ? "collapsed" : ""}`}
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand" : "Collapse"}
      >
        <span className="rail-caret">{collapsed ? "›" : "‹"}</span>
      </button>

      {showModal && (
        <ConfirmationModal
          title={modalConfig.title}
          message={modalConfig.message}
          onConfirm={modalConfig.onConfirm}
          onCancel={() => setShowModal(false)}
        />
      )}
    </>
  );
}