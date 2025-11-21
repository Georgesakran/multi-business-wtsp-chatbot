// utils/i18n.js

/**
 * Convert language into langKey
 * arabic → ar
 * english → en
 * hebrew → he
 */
function langKeyFrom(langFull) {
  if (!langFull) return "en";

  const map = {
    arabic: "ar",
    english: "en",
    hebrew: "he",
  };

  return map[langFull] || "en";
}

/**
 * Get localized field from { ar, en, he }
 * or return string directly
 */
function getLocalized(field, langKey) {
  if (!field) return "";

  if (typeof field === "string") return field;

  if (typeof field === "object") {
    return (
      field[langKey] ||
      field.en ||
      field.ar ||
      field.he ||
      ""
    );
  }

  return "";
}

/**
 * Basic translations for fallback or helper messages
 */
const I18N_TEXT = {
  help: {
    ar: "ℹ️ طريقة الاستخدام: اختر بالزر أو الأرقام (1،2،3…).",
    en: "ℹ️ How to use: choose using buttons or numbers (1,2,3...).",
    he: "ℹ️ איך משתמשים: בחרי בכפתור או במספרים (1,2,3...).",
  },
  menuHint: {
    ar: "💬 أرسل *menu* لعرض القائمة.",
    en: "💬 Send *menu* to see the menu.",
    he: "💬 שלחי *menu* להצגת התפריט.",
  }
};

function t(langKey, key) {
  return I18N_TEXT[key]?.[langKey] || I18N_TEXT[key]?.en || "";
}

module.exports = {
  langKeyFrom,
  getLocalized,
  t
};