import React, { useContext, useState,useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/Sidebar.css";
import { LanguageContext } from "../context/LanguageContext";
import { handleLogout } from "../utils/logout";
import ConfirmationModal from "./ConfirmationModal";
import translations from "../translate/translations";
import { getLabelByLang } from "../translate/getLabelByLang"; // Adjust the import path as necessary

function Sidebar({ collapsed, setCollapsed, role }) {
  const { language } = useContext(LanguageContext);
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    onConfirm: () => {}
  });


// After `useState` declarations
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

// Add this inside your return (above .modern-sidebar)

  const handleClick = (e, to) => {
    if (to === "/logout") {
      e.preventDefault();
      setModalConfig({
        title: getLabelByLang(translations.modals.logoutTitle, language),
        message: getLabelByLang(translations.modals.logoutMessage, language),
        onConfirm: () => {
          handleLogout(navigate);
          setShowModal(false);
        }
      });
      setShowModal(true);
    } else {
      if (window.innerWidth < 768) {
        setCollapsed(true); // Collapse sidebar on mobile after navigating
      }
    }
  };

  const adminMenu = [
    { to: "/admin/Dashboard", label: { en: "Dashboard", ar: "لوحة التحكم", he: "לוח ניהול" }, icon: "🧠" },
    { to: "/admin/businesses", label: { en: "Businesses", ar: "الأنشطة", he: "עסקים" }, icon: "🏢" },
    { to: "/admin/services", label: { en: "All Services", ar: "كل الخدمات", he: "כל השירותים" }, icon: "🛠️" },
    { to: "/admin/add-business", label: { en: "Add Business", ar: "إضافة نشاط", he: "הוסף עסק" }, icon: "➕" },
    { to: "/logout", label: { en: "Logout", ar: "تسجيل الخروج", he: "התנתק" }, icon: "🚪" },
  ];

  const t = translations.sidebar;

  const ownerMenu = [
    { to: "/owner/Dashboard", label: t.dashboard, icon: "🏠" },
    { to: "/owner/profile", label: t.businessInfo, icon: "🏢" },
    { to: "/owner/services", label: t.services, icon: "💈" },
    { to: "/owner/bookings", label: t.bookings, icon: "📅" },
    { to: "/owner/calendar", label: t.calendar, icon: "📆" },
    { to: "/logout", label: t.logout, icon: "🚪" },
  ];
  


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