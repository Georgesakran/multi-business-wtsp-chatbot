import React, { useContext, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/Sidebar.css";
import { LanguageContext } from "../context/LanguageContext";
import { handleLogout } from "../utils/logout";
import ConfirmationModal from "./ConfirmationModal";

function Sidebar({ collapsed, setCollapsed, role }) {
  const { language } = useContext(LanguageContext);
  const isRTL = language === "arabic" || language === "hebrew";
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const handleClick = (e, to) => {
    if (to === "/logout") {
      e.preventDefault();
      setModalConfig({
        title: language === "arabic"
          ? "تأكيد تسجيل الخروج"
          : language === "hebrew"
          ? "אישור יציאה"
          : "Confirm Logout",
        message: language === "arabic"
          ? "هل أنت متأكد أنك تريد تسجيل الخروج؟"
          : language === "hebrew"
          ? "אתה בטוח שברצונך להתנתק?"
          : "Are you sure you want to log out?",
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

  const ownerMenu = [
    { to: "/owner/Dashboard", label: { en: "Dashboard", ar: "لوحة التحكم", he: "לוח ניהול" }, icon: "🏠" },
    { to: "/profile", label: { en: "Business Info", ar: "معلومات النشاط", he: "פרטי העסק" }, icon: "🏢" },
    { to: "/services", label: { en: "Services", ar: "الخدمات", he: "שירותים" }, icon: "💈" },
    { to: "/bookings", label: { en: "Bookings", ar: "الحجوزات", he: "הזמנות" }, icon: "📅" },
    { to: "/logout", label: { en: "Logout", ar: "تسجيل الخروج", he: "התנתק" }, icon: "🚪" },
  ];

  const menu = role === "admin" ? adminMenu : ownerMenu;

  return (
    <>
      <div className={`modern-sidebar ${isRTL ? "rtl" : "ltr"} ${collapsed ? "collapsed" : ""}`}>
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