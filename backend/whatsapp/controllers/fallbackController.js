// controllers/fallbackController.js

const { sendWhatsApp } = require("../services/messaging/twilioService");
const { getConfigMessage } = require("../services/menuService");
const { t } = require("../utils/i18n");

module.exports = {
  /**
   * Handles ANY user text that does not match a flow.
   */
  handleFallback: async ({ biz, from, customer }) => {
    const lang = customer.language || "english";
    const langKey = 
      lang === "arabic" ? "ar" :
      lang === "hebrew" ? "he" :
      "en";

    // 1) Try config fallback message (per-language)
    const fallbackText = getConfigMessage(
      biz,
      langKey,
      "fallback",
      t(lang, "hint_menu")
    );

    // 2) Send reply
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: fallbackText,
    });
  },
};