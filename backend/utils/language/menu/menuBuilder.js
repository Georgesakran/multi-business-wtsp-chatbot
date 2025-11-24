const { getVisibleMenuItemsSorted } = require("./menuUtils");
const { businessNameFor } = require("../../business/businessNameHelper"); 
const { getConfigMessage } = require("../../config/configMessageHelper");


function buildMenuText(biz, langKey, langFull) {
  const items = getVisibleMenuItemsSorted(biz);
  const bizName = businessNameFor(biz, langKey);

  // If no menuItems are configured → fallback to default menu
  if (!items.length) {
    return getConfigMessage(
      biz,
      langKey,
      "main_menu",
      langFull === "arabic"
        ? "*القائمة*\n1) حجز موعد 💅\n2) الأسئلة الشائعة ❓\n3) تواصل مع المالك 📞\n\nأرسل رقم الخيار."
        : langFull === "hebrew"
        ? "*תפריט*\n1) קבע/י תור 💅\n2) שאלות נפוצות ❓\n3) יצירת קשר 📞\n\nשלח/י מספר."
        : "*Menu*\n1) Book an appointment 💅\n2) FAQs ❓\n3) Contact owner 📞\n\nReply with a number."
    );
  }

  // Header (new behavior)
  const header =
    langFull === "arabic"
      ? `🌿 *القائمة الرئيسية — ${bizName}*`
      : langFull === "hebrew"
      ? `🌿 *תפריט ראשי — ${bizName}*`
      : `🌿 *Main Menu — ${bizName}*`;

  // Menu items
  const lines = items.map((item, idx) => {
    const labelObj = item.label || item.labels || {};
    const label =
      labelObj[langKey] ||
      labelObj.en ||
      labelObj.ar ||
      labelObj.he ||
      item.action;

    return `${idx + 1}) ${label}`;
  });

  // Footer
  const footer =
    langFull === "arabic"
      ? "\n💬 أرسل رقم الخيار أو اكتب *menu* في أي وقت لعرض القائمة مرة أخرى."
      : langFull === "hebrew"
      ? "\n💬 שלח/י את מספר האפשרות או כתוב/י *menu* בכל זמן כדי לראות את התפריט שוב."
      : "\n💬 Send the option number or type *menu* anytime to see this list again.";

  return [header, lines.join("\n"), footer].filter(Boolean).join("\n\n");
}

module.exports = { buildMenuText };
