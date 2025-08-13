import React, { useContext, useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/Sidebar.css";
import { LanguageContext } from "../context/LanguageContext";
import { handleLogout } from "../utils/logout";
import ConfirmationModal from "./ConfirmationModal";
import translations from "../translate/translations";
import { getLabelByLang } from "../translate/getLabelByLang";

function Sidebar({ collapsed, setCollapsed, role }) {
  const { language } = useContext(LanguageContext);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const businessType = user?.businessType;
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
  });

  useEffect(() => {
    const body = document.body;
    if (window.innerWidth < 768 && !collapsed) {
      body.classList.add("no-scroll");
    } else {
      body.classList.remove("no-scroll");
    }
    return () => {
      body.classList.remove("no-scroll");
    };
  }, [collapsed]);

  const handleClick = (e, to) => {
    if (to === "/logout") {
      e.preventDefault();
      setModalConfig({
        title: getLabelByLang(translations.modals.logoutTitle, language),
        message: getLabelByLang(translations.modals.logoutMessage, language),
        onConfirm: () => {
          handleLogout(navigate);
          setShowModal(false);
        },
      });
      setShowModal(true);
    } else {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    }
  };

  const adminMenu = [
    { to: "/admin/Dashboard", label: translations.sidebar.dashboard, icon: "🧠" },
    { to: "/admin/businesses", label: translations.sidebar.businesses, icon: "🏢" },
    { to: "/admin/services", label: translations.sidebar.allServices, icon: "🛠️" },
    { to: "/admin/add-business", label: translations.sidebar.addBusiness, icon: "➕" },
    { to: "/logout", label: translations.sidebar.logout, icon: "🚪" },
  ];

  const baseOwnerMenu = [
    { to: "/owner/Overview", label: translations.sidebar.overview, icon: "🏠" },
    { to: "/owner/Dashboard", label: translations.sidebar.dashboard, icon: "📊" },
    { to: "/owner/chatbot", label: translations.sidebar.chatbot, icon: "🤖" },
    { to: "/owner/conversations", label: translations.sidebar.conversations, icon: "💬" },
    { to: "/owner/faq", label: translations.sidebar.qna, icon: "❓" },
    { to: "/owner/profile", label: translations.sidebar.businessInfo, icon: "🏢" },
    { to: "/owner/settings", label: translations.sidebar.settings, icon: "⚙️" },
  ];

  const bookingExtras = [
    { to: "/owner/calendar", label: translations.sidebar.calendar, icon: "📆" },
    { to: "/owner/bookings", label: translations.sidebar.bookings, icon: "📅" },
    { to: "/owner/clients", label: translations.sidebar.clients, icon: "👥" },
    { to: "/owner/services", label: translations.sidebar.services, icon: "💈" },
    { to: "/owner/courses", label: translations.sidebar.courses, icon: "📚" },
  ];

  const productExtras = [
    { to: "/owner/products", label: translations.sidebar.products, icon: "🛒" },
    { to: "/owner/orders", label: translations.sidebar.orders, icon: "📦" },
    { to: "/owner/inventory", label: translations.sidebar.inventory, icon: "📊" },
    { to: "/owner/sales-report", label: translations.sidebar.salesReport, icon: "📈" },
  ];

  // const infoExtras = [
  //   { to: "/owner/faq", label: { en: "FAQs", ar: "الأسئلة الشائعة", he: "שאלות נפוצות" }, icon: "📖" },
  //   { to: "/owner/contact-requests", label: { en: "Contact Requests", ar: "طلبات التواصل", he: "בקשות יצירת קשר" }, icon: "📬" },
  // ];
  
  // const deliveryExtras = [
  //   { to: "/owner/orders", label: translations.sidebar.orders, icon: "🛵" },
  //   { to: "/owner/delivery-status", label: { en: "Delivery Status", ar: "حالة التوصيل", he: "סטטוס משלוחים" }, icon: "🚚" },
  // ];
  
  // const eventExtras = [
  //   { to: "/owner/events", label: { en: "Events", ar: "الفعاليات", he: "אירועים" }, icon: "🎉" },
  //   { to: "/owner/tickets", label: { en: "Tickets", ar: "التذاكر", he: "כרטיסים" }, icon: "🎟️" },
  // ];

  const logoutItem = { to: "/logout", label: translations.sidebar.logout, icon: "🚪" };

  let ownerMenu = [...baseOwnerMenu];

  if (["booking", "mixed"].includes(businessType)) {
    ownerMenu.push(...bookingExtras);
  }
  if (["product", "mixed"].includes(businessType)) {
    ownerMenu.push(...productExtras);
  }
  // if (["info"].includes(businessType)) {
  //   ownerMenu.push(...infoExtras);
  // }
  // if (["delivery"].includes(businessType)) {
  //   ownerMenu.push(...deliveryExtras);
  // }
  // if (["event"].includes(businessType)) {
  //   ownerMenu.push(...eventExtras);
  // }

  ownerMenu.push(logoutItem);

  const menu = role === "admin" ? adminMenu : ownerMenu;

  return (
    <>
      {window.innerWidth < 768 && !collapsed && (
        <div
          className="mobile-sidebar-overlay active"
          onClick={() => setCollapsed(true)}
        ></div>
      )}
      <div className={`modern-sidebar ${collapsed ? "collapsed" : ""}`}>
        <nav className="sidebar-menu">
        {window.innerWidth < 768 && !collapsed && (
          <div className="sidebar-mobile-logo" onClick={() => navigate("/owner/Dashboard")}>
          <img
            src="/logo_png-noback.png"
            alt="Logo"
            className="logo"
            style={{ width: "80px", height: "80px" ,paddingLeft: "35%"}}
            onClick={() => navigate("/owner/Dashboard")}
          />
          </div>
        )}
          {menu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="sidebar-link"
              activeclassname="active"
              onClick={(e) => handleClick(e, item.to)}
            >
              <span className="icon">{item.icon}</span>
              {!collapsed && (
                <span className="label">
                  {getLabelByLang(item.label, language)}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

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

export default Sidebar;