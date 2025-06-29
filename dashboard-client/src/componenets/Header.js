import React, { useContext, useState, useEffect } from "react";
import "../styles/Header.css";
import { LanguageContext } from "../context/LanguageContext";
import { useLocation, useNavigate } from "react-router-dom";

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
    english: "Dashboard",
    arabic: "لوحة التحكم",
    hebrew: "לוח ניהול",
  },
  "/admin/businesses": {
    english: "Businesses",
    arabic: "الأعمال",
    hebrew: "עסקים",
  },
  "/profile": {
    english: "Business Info",
    arabic: "معلومات العمل",
    hebrew: "פרטי העסק",
  },
  "/admin/add-business": {
    english: "Add Business",
    arabic: "إضافة عمل",
    hebrew: "הוספת עסק",
  },
  "/owner/bookings": {
    english: "Bookings",
    arabic: "الحجوزات",
    hebrew: "הזמנות",
  },
  "/owner/calendar": {
    english: "Calendar",
    arabic: "رزنامة",
    hebrew: "לוח שנה",
  },
  "/owner/settings": {
    english: "Settings",
    arabic: "الإعدادات",
    hebrew: "הגדרות",
  },
};

function Header({ setCollapsed }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const { language, setLanguage } = useContext(LanguageContext);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    const handleResize = () => setIsMobile(window.innerWidth < 768);

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const toggleDropdown = () => setOpen(!open);

  const selectLang = (lang) => {
    localStorage.setItem("lang", lang);
    setLanguage(lang);
    setOpen(false);
  };

  const handleSettingsClick = () => navigate("/owner/settings");

  const currentPath = location.pathname;
  const title =
    PAGE_TITLES[currentPath]?.[language] || PAGE_TITLES["/dashboard"]?.[language];

  return (
    <header className={`header-bar ${isScrolled ? "scrolled" : ""}`}>
    <div className="header-left">
      {isMobile && (
        <button
          className="hamburger-toggle"
          onClick={() => setCollapsed((prev) => !prev)}
        >
          ☰
        </button>
      )}
      <h1 className="page-title">{title}</h1>
    </div>
  
    <div className="header-actions">
      <button className="settings-button" onClick={handleSettingsClick}>
        ⚙️ {language === "arabic" ? "الإعدادات" : language === "hebrew" ? "הגדרות" : "Settings"}
      </button>
  
      <div className="lang-selector">
        <div className="lang-current" onClick={toggleDropdown}>
          🌐 {LANGUAGES.find((l) => l.code === language).label}
        </div>
  
        {open && (
          <ul className="lang-dropdown">
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
    </div>
  </header>
  );
}

export default Header;