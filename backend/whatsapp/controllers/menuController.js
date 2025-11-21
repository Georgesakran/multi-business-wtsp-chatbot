// services/menuService.js

const { t } = require("../utils/i18n");
const { sendWhatsApp } = require("./messaging/twilioService");
const stateManager = require("../state/stateManager");

// -----------------------------------------
// Parse menu index (Arabic/Hebrew/English)
// -----------------------------------------
function parseMenuIndex(text) {
  if (!text) return null;

  text = text.trim();

  // Arabic-Indic digits: ٠١٢٣٤٥٦٧٨٩
  const arZero = "٠".charCodeAt(0);
  // Persian-Indic digits: ۰۱۲۳۴۵۶۷۸۹
  const faZero = "۰".charCodeAt(0);

  let normalized = "";

  for (const ch of text) {
    const code = ch.charCodeAt(0);

    // Arabic-Indic
    if (code >= arZero && code <= arZero + 9) {
      normalized += (code - arZero).toString();
      continue;
    }

    // Persian-Indic
    if (code >= faZero && code <= faZero + 9) {
      normalized += (code - faZero).toString();
      continue;
    }

    // English digits
    if (/[0-9]/.test(ch)) {
      normalized += ch;
      continue;
    }
  }

  if (!normalized) return null;

  const n = parseInt(normalized, 10);
  if (!Number.isFinite(n) || n <= 0) return null;

  return n - 1;
}

// -----------------------------------------
// Return structured menu items
// -----------------------------------------
function getVisibleMenuItems(biz) {
  // Later we can add dynamic filtering
  return biz.config?.menuItems || [];
}

// -----------------------------------------
// Build the main menu text (multi-language)
// -----------------------------------------
function buildMenuText(biz, langKey, lang) {
  const items = getVisibleMenuItems(biz);

  let lines = [];

  items.forEach((item, i) => {
    const label = item.label?.[langKey] || item.label?.en || "";
    lines.push(`${i + 1}) ${label}`);
  });

  const footer =
    lang === "arabic"
      ? "\n\n💬 أرسل رقم الخيار أو اكتب *menu* لعرض القائمة."
      : lang === "hebrew"
      ? "\n\n💬 כתוב/י מספר בתפריט או *menu*."
      : "\n\n💬 Send a number or type *menu*.";

  return t(lang, "main_menu_title") + "\n\n" + lines.join("\n") + footer;
}

// -----------------------------------------
// Execute menu item actions
// -----------------------------------------
async function executeMenuAction({
  action,
  payload,
  biz,
  from,
  customer,
  state,
  lang,
  langKey,
}) {
  switch (action) {
    case "booking":
      await stateManager.setState(state, { step: "BOOKING_SELECT_SERVICE" });
      return sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: t(lang, "ask_service"),
      });

    case "services":
      return sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: t(lang, "services_list"),
      });

    case "products":
      return sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: t(lang, "products_list"),
      });

    case "about":
      return sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: t(lang, "about_business"),
      });

    case "contact":
      return sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: t(lang, "contact_us"),
      });

    default:
      return sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: t(lang, "unknown_option"),
      });
  }
}

module.exports = {
  parseMenuIndex,
  buildMenuText,
  getVisibleMenuItems,
  executeMenuAction,
};