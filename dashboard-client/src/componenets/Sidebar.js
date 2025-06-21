import React, { useContext } from "react";
import { NavLink } from "react-router-dom";
import "../styles/Sidebar.css";
import { LanguageContext } from "../context/LanguageContext";

function Sidebar({ collapsed, setCollapsed, role }) {
  const { language } = useContext(LanguageContext);
  const isRTL = language === "arabic" || language === "hebrew";


  // === Admin Menu ===
  const adminMenu = [
    { to: "/admin/Dashboard", label: { en: "Dashboard", ar: "لوحة التحكم", he: "לוח ניהול" }, icon: "🧠" },
    { to: "/admin/businesses", label: { en: "Businesses", ar: "الأنشطة", he: "עסקים" }, icon: "🏢" },
    { to: "/admin/services", label: { en: "All Services", ar: "كل الخدمات", he: "כל השירותים" }, icon: "🛠️" },
    { to: "/admin/add-business", label: { en: "Add Business", ar: "إضافة نشاط", he: "הוסף עסק" }, icon: "➕" },
    { to: "/logout", label: { en: "Logout", ar: "تسجيل الخروج", he: "התנתק" }, icon: "🚪" },
  ];

  // === Owner Menu ===
  const ownerMenu = [
    { to: "/owner/Dashboard", label: { en: "Dashboard", ar: "لوحة التحكم", he: "לוח ניהול" }, icon: "🏠" },
    { to: "/profile", label: { en: "Business Info", ar: "معلومات النشاط", he: "פרטי העסק" }, icon: "🏢" },
    { to: "/services", label: { en: "Services", ar: "الخدمات", he: "שירותים" }, icon: "💈" },
    { to: "/bookings", label: { en: "Bookings", ar: "الحجوزات", he: "הזמנות" }, icon: "📅" },
    { to: "/logout", label: { en: "Logout", ar: "تسجيل الخروج", he: "התנתק" }, icon: "🚪" },
  ];

  const menu = role === "admin" ? adminMenu : ownerMenu;

  return (
    <div className={`modern-sidebar ${isRTL ? "rtl" : "ltr"} ${collapsed ? "collapsed" : ""}`}>

      <nav className="sidebar-menu">
        {menu.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="sidebar-link"
            activeclassname="active"
          >
            <span className="icon">{item.icon}</span>
            {!collapsed && (
              <span className="label">
                {language === "arabic"
                  ? item.label.ar
                  : language === "hebrew"
                  ? item.label.he
                  : item.label.en}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default Sidebar;