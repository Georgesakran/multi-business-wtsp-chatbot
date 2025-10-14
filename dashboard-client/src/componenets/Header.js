import React, { useContext, useState, useEffect } from "react";
import "../styles/Header.css";
import { LanguageContext } from "../context/LanguageContext";
import { useLocation } from "react-router-dom";
import translations from "../translate/translations";
import { getLabelByLang } from "../translate/getLabelByLang";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "he", label: "עברית" },
];

function Header({ collapsed, setCollapsed }) {
  const location = useLocation();
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

  const currentPath = location.pathname;
  const pageTitles = translations.pageTitles;
  const title =
    getLabelByLang(pageTitles[currentPath], language) ||
    getLabelByLang(pageTitles["/owner/Dashboard"], language);

  return (
    <header className={`header-bar ${isScrolled ? "scrolled" : ""}`}>
      <div className="header-left">
        {/* Hamburger only for mobile */}
        {isMobile && (
          <button
            className="hamburger-toggle"
            onClick={() => setCollapsed((prev) => !prev)}
          >
            ☰
          </button>
        )}

        {/* Page title always visible */}
        <h1
          className={`page-title ${
            isMobile
              ? "mobile-title"
              : collapsed
              ? "collapsed-margin"
              : "expanded-margin"
          }`}
        >
          {title}
        </h1>
      </div>

      <div className="header-actions">
        <div className="lang-selector">
          <div className="lang-current" onClick={toggleDropdown}>
            🌐 {LANGUAGES.find((l) => l.code === language)?.label}
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
