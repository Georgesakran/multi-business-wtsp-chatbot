// services/menuService.js

const { t } = require("../utils/i18n");

/**
 * Parse menu index (Arabic / Persian / English digits)
 * Supports:
 *   - 1,2,3
 *   - ١,٢,٣ (Arabic-Indic)
 *   - ۱,۲,۳ (Persian-Indic)
 */
function parseMenuIndex(text) {
  if (!text) return null;

  text = text.trim();

  const arZero = "٠".charCodeAt(0); // Arabic-Indic
  const faZero = "۰".charCodeAt(0); // Persian-Indic

  let normalized = "";

  for (const ch of text) {
    const code = ch.charCodeAt(0);

    // Arabic-Indic ٠١٢٣٤٥٦٧٨٩
    if (code >= arZero && code <= arZero + 9) {
      normalized += (code - arZero).toString();
      continue;
    }

    // Persian-Indic ۰۱۲۳۴۵۶۷۸۹
    if (code >= faZero && code <= faZero + 9) {
      normalized += (code - faZero).toString();
      continue;
    }

    // English 0–9
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

/**
 * Return structured menu items from business config
 */
function getVisibleMenuItems(biz) {
  return Array.isArray(biz?.config?.menuItems)
    ? biz.config.menuItems.filter((x) => x.enabled !== false)
    : [];
}

/**
 * Build multi-language menu text
 */
function buildMenuText(biz, langKey, lang) {
  const items = getVisibleMenuItems(biz);

  let lines = [];

  items.forEach((item, i) => {
    const label =
      item.label?.[langKey] ||
      item.label?.en ||
      "—";
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

/**
 * Execute menu action based on config
 */
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
  const { sendWhatsApp } = require("./messaging/twilioService");
  const stateManager = require("../state/stateManager");

  switch (action) {
    case "booking":
      await stateManager.setState(state, {
        step: "BOOKING_SELECT_SERVICE",
      });

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

    case "custom":
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