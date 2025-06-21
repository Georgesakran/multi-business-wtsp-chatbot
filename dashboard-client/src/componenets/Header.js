import React, { useContext, useState, useEffect } from "react";
import "../styles/Header.css";
import { LanguageContext } from "../context/LanguageContext";
import { useLocation } from "react-router-dom";

const LANGUAGES = [
  { code: "english", label: "English" },
  { code: "arabic", label: "العربية" },
  { code: "hebrew", label: "עברית" },
];

const PAGE_TITLES = { 
  "/admin/Dashboard": {
    english: "Admin Dashboard",
    arabic: "لوحة التحكم",
    hebrew: "לוח ניהול",
  },
  "/owner/Dashboard": {
    english: "Owner Dashboard",
    arabic: "لوحة صاحب العمل",
    hebrew: "לוח בעל העסק",
  },
  "/admin/businesses": {
    english: "Admin Dashboard",
    arabic: "لوحة التحكم",
    hebrew: "לוח ניהול",
  },
  "/profile": {
    english: "Business Info",
    arabic: "معلومات العمل",
    hebrew: "פרטי העסק",
  },
  "/admin/add-business": {
    english: "add-business",
    arabic: "الخدمات",
    hebrew: "שירותים",
  },
  "/bookings": {
    english: "Bookings",
    arabic: "الحجوزات",
    hebrew: "הזמנות",
  },
};

function Header() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { language, setLanguage } = useContext(LanguageContext);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleDropdown = () => setOpen(!open);
  const selectLang = (lang) => {
    localStorage.setItem("lang", lang);
    setLanguage(lang);
    setOpen(false);
  };

  const currentPath = location.pathname;
  const title =
    PAGE_TITLES[currentPath]?.[language] || PAGE_TITLES["/dashboard"][language];

  const isRTL = language === "arabic" || language === "hebrew";

  return (
    <header
      className={`header-bar ${isScrolled ? "scrolled" : ""} ${
        isRTL ? "rtl" : "ltr"
      }`}
    >
      <h1 className="page-title">{title}</h1>

      <div className="lang-selector">
        <div className="lang-current" onClick={toggleDropdown}>
          🌐 {LANGUAGES.find((l) => l.code === language).label}
        </div>

        {open && (
          <ul className={`lang-dropdown ${isRTL ? "rtl-drop" : ""}`}>
            {LANGUAGES.map((lang) => (
              <li
                key={lang.code}
                className={lang.code === language ? "active" : ""}
                onClick={() => selectLang(lang.code)}
              >
                {lang.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </header>
  );
}

export default Header;
