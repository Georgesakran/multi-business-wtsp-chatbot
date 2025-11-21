// services/menuService.js
const { getLocalized } = require("../utils/i18n");

module.exports = {
  getVisibleMenuItems(biz) {
    const list = (biz?.config?.menuItems || []).filter(
      (item) => item && item.enabled !== false
    );

    list.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
    return list;
  },

  buildMenuText(biz, langKey, langFull) {
    const items = this.getVisibleMenuItems(biz);

    if (!items.length) {
      return langFull === "arabic"
        ? "*القائمة*\n1) حجز موعد 💅\n2) الأسئلة الشائعة ❓\n3) تواصل مع المالك 📞"
        : langFull === "hebrew"
        ? "*תפריט*\n1) קבע/י תור 💅\n2) שאלות נפוצות ❓\n3) יצירת קשר 📞"
        : "*Menu*\n1) Book an appointment 💅\n2) FAQs ❓\n3) Contact owner 📞";
    }

    const header =
      langFull === "arabic"
        ? "🌿 *القائمة الرئيسية*"
        : langFull === "hebrew"
        ? "🌿 *תפריט ראשי*"
        : "🌿 *Main Menu*";

    const lines = items.map((item, i) => {
      const label =
        item.label?.[langKey] ||
        item.label?.en ||
        item.label?.ar ||
        item.label?.he ||
        item.action;
      return `${i + 1}) ${label}`;
    });

    const footer =
      langFull === "arabic"
        ? "\n💬 أرسل رقم الخيار أو اكتب *menu* لعرض القائمة."
        : langFull === "hebrew"
        ? "\n💬 שלח/י מספר או כתוב/י *menu*."
        : "\n💬 Send the option number or type *menu* anytime.";

    return [header, lines.join("\n"), footer].join("\n\n");
  },
};