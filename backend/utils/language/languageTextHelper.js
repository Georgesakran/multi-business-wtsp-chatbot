const { CANCEL } = require("../constants/systemConstants"); 
// adjust path OR remove if you want to inline CANCEL as a number
// If CANCEL is defined inside twilioWebhook.js, tell me — I’ll fix it.


// i18n helper for small texts (help, menu, hints, cancel message…)
function t(lang, key, vars = {}) {
  const L = {
    choose_language: {
      arabic: "من فضلك اختر اللغة: 💬",
      english: "💬 Please choose your language:",
      hebrew: "בחר/י שפה בבקשה: 💬",
    }, 
    arabic: { arabic: "العربية", english: "Arabic", hebrew: "Arabic" },
    english: { arabic: "الإنجليزية", english: "English", hebrew: "English" },
    hebrew: { arabic: "العبرية", english: "Hebrew", hebrew: "עברית" },
    
    got_language: {
      arabic: "تم تحديث اللغة ✅",
      english: "Language updated ✅",
      hebrew: "השפה עודכנה ✅",
    },
    welcome: {
      arabic: "أهلاً بك! كيف نقدر نساعدك اليوم؟",
      english: "Welcome! How can we help you today?",
      hebrew: "ברוך/ה הבא/ה! איך נוכל לעזור היום?",
    },
    hint_menu: {
      arabic: "أرسل *menu* لعرض القائمة أو *book* لبدء الحجز.",
      english: "Send *menu* for the menu or *book* to start booking.",
      hebrew: "שלח/י *menu* לתפריט או *book* כדי להתחיל הזמנה.",
    },
    cancelled: {
      arabic: "❌ تم الإلغاء. أرسل *menu* للبدء من جديد.",
      english: "❌ Cancelled. Send *menu* to start again.",
      hebrew: "❌ בוטל. שלח/י *menu* כדי להתחיל מחדש.",
    },
    restarting: {
      arabic: "🔁 نبدأ من جديد…",
      english: "🔁 Starting again…",
      hebrew: "🔁 מתחילים מחדש…",
    },
    help: {
      arabic: `ℹ️ *طريقة الاستخدام*\n• اختر بالزر أو الأرقام (1، 2، 3...)\n• *${CANCEL}* أو *cancel* للإلغاء\n• *menu* لعرض القائمة`,
      english: `ℹ️ *How to use*\n• Choose by button or numbers (1, 2, 3...)\n• *${CANCEL}* or *cancel* to cancel\n• *menu* to see options`,
      hebrew: `ℹ️ *איך משתמשים*\n• בחר/י בכפתור או במספרים (1, 2, 3...)\n• *${CANCEL}* או *cancel* לביטול\n• *menu* להצגת אפשרויות`,
    },
  };

  let s = L[key]?.[lang] || L[key]?.english || "";
  Object.entries(vars).forEach(([k, v]) => {
    s = s.replaceAll(`{{${k}}}`, v);
  });
  return s;
}



// full-word language used in Customer + business config
function langFromCustomer(cust, biz) {
  return (
    cust?.language ||
    biz?.config?.language ||
    biz?.language ||
    (biz?.wa?.locale === "ar"
      ? "arabic"
      : biz?.wa?.locale === "he"
      ? "hebrew"
      : "english") ||
    "english"
  );
}



// converts customer/biz language → short lang key for DB messages
function langKeyFromCustomer(customer, biz) {
  if (customer?.language === "arabic") return "ar";
  if (customer?.language === "english") return "en";
  if (customer?.language === "hebrew") return "he";
  if (biz?.config?.language === "arabic") return "ar";
  if (biz?.config?.language === "english") return "en";
  if (biz?.config?.language === "hebrew") return "he";
  if (biz?.wa?.locale === "ar") return "ar";
  if (biz?.wa?.locale === "he") return "he";
  if (biz?.wa?.locale === "en") return "en";
  return "en";
}



// converts user button choice → short key
function langKeyFromChoice(choice) {
  if (choice === "arabic") return "ar";
  if (choice === "english") return "en";
  if (choice === "hebrew") return "he";
  return "en";
}



module.exports = {
  t,
  langFromCustomer,
  langKeyFromCustomer,
  langKeyFromChoice,
};
