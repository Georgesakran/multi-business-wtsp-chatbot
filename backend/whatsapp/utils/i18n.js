// utils/i18n.js

/**
 * Convert full language to key:
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
 * Get localized value from { ar, en, he }
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
 * FULL TRANSLATIONS for the platform
 */
const I18N_TEXT = {
  // ------------------------------
  // GLOBAL HELPERS
  // ------------------------------
  help: {
    ar: "ℹ️ طريقة الاستخدام: اختر بالزر أو الأرقام (1،2،3…).",
    en: "ℹ️ How to use: choose using buttons or numbers (1,2,3...).",
    he: "ℹ️ איך משתמשים: בחרי בכפתור או במספרים (1,2,3...).",
  },

  menuHint: {
    ar: "💬 أرسل *menu* لعرض القائمة.",
    en: "💬 Send *menu* to see the menu.",
    he: "💬 שלחי *menu* להצגת התפריט.",
  },

  // ------------------------------
  // MAIN MENU
  // ------------------------------
  main_menu_title: {
    ar: "🌿 *القائمة الرئيسية*",
    en: "🌿 *Main Menu*",
    he: "🌿 *תפריט ראשי*",
  },

  // ------------------------------
  // BOOKING FLOW TEXT
  // ------------------------------
  ask_service: {
    ar: "1️⃣ من فضلك اختاري الخدمة المطلوبة من القائمة.",
    en: "1️⃣ Please select a service from the list.",
    he: "1️⃣ בבקשה בחרי את השירות הרצוי מהרשימה.",
  },

  no_slots: {
    ar: "⚠️ لا توجد أوقات متاحة في هذا اليوم. اختاري يومًا آخر.",
    en: "⚠️ No available time slots for that day. Try another date.",
    he: "⚠️ אין שעות פנויות ביום זה. נסי יום אחר.",
  },

  invalid_date: {
    ar: "❌ تاريخ غير صحيح. استخدمي صيغة YYYY-MM-DD.",
    en: "❌ Invalid date. Use YYYY-MM-DD format.",
    he: "❌ תאריך לא תקין. השתמשי בפורמט YYYY-MM-DD.",
  },

  invalid_time: {
    ar: "❌ رقم غير صحيح. اختاري رقمًا من الأوقات المتاحة.",
    en: "❌ Invalid number. Choose a number from the list.",
    he: "❌ מספר לא תקין. בחרי מספר מהרשימה.",
  },

  name_too_short: {
    ar: "❌ الاسم قصير جدًا. اكتبي اسمًا واضحًا (على الأقل حرفين).",
    en: "❌ Name is too short. Please send a clear name (min 2 characters).",
    he: "❌ השם קצר מדי. כתבי שם ברור (לפחות 2 תווים).",
  },

  // ------------------------------
  // MENU CATEGORIES
  // ------------------------------
  services_list: {
    ar: "💆‍♀️ قائمة الخدمات:\nاختاري رقم الخدمة المطلوبة.",
    en: "💆‍♀️ Services list:\nChoose a service number.",
    he: "💆‍♀️ רשימת השירותים:\nבחרי מספר שירות.",
  },

  products_list: {
    ar: "🧴 قائمة المنتجات:\nهذه منتجاتنا المتوفرة.",
    en: "🧴 Products list:\nThese are our available products.",
    he: "🧴 רשימת מוצרים:\nמוצרים זמינים אצלנו.",
  },

  about_business: {
    ar: "ℹ️ معلومات عن الصالون:\nنحن نقدم خدمات تجميل احترافية بأعلى جودة.",
    en: "ℹ️ About the business:\nWe provide high-quality professional beauty services.",
    he: "ℹ️ מידע על העסק:\nאנחנו מציעים שירותי יופי ברמה גבוהה.",
  },

  contact_us: {
    ar: "☎️ تواصل/ي معنا:\n📞 الهاتف: متاح دائمًا\n📍 العنوان: رينيه",
    en: "☎️ Contact us:\n📞 Phone: Always available\n📍 Address: Rieneh",
    he: "☎️ צרי קשר:\n📞 טלפון: זמין תמיד\n📍 כתובת: ריינה",
  },

  unknown_option: {
    ar: "❌ خيار غير معروف. من فضلك اختاري رقمًا من القائمة أو اكتبي *menu*.",
    en: "❌ Unknown option. Please choose a number or type *menu*.",
    he: "❌ אפשרות לא תקפה. בחרי מספר מהתפריט או כתבי *menu*.",
  }
};

/**
 * Translator function
 * t(langKey, key)
 */
function t(langKey, key) {
  return (
    I18N_TEXT[key]?.[langKey] ||
    I18N_TEXT[key]?.en ||
    ""
  );
}

module.exports = {
  langKeyFrom,
  getLocalized,
  t,
  I18N_TEXT
};