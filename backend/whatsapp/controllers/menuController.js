// controllers/menuController.js

const stateManager = require("../state/stateManager");
const menuService = require("../services/menuService");
const { sendWhatsApp } = require("../services/messaging/twilioService");
const { t } = require("../utils/i18n");

module.exports = {
  /**
   * Show the main menu (multi-language)
   */
  showMainMenu: async ({ biz, from, customer, state, lang }) => {
    const langKey =
      lang === "arabic" ? "ar" :
      lang === "hebrew" ? "he" : "en";

    const menuText = menuService.buildMenuText(biz, langKey, lang);

    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: menuText,
    });

    await stateManager.setState(state, { step: "MENU" });
  },

  /**
   * Handle menu selection (1–10)
   */
  handleMenuSelection: async ({ biz, from, customer, state, body, lang }) => {
    const langKey =
      lang === "arabic" ? "ar" :
      lang === "hebrew" ? "he" : "en";

    const structuredItems = menuService.getVisibleMenuItems(biz);

    const index = menuService.parseMenuIndex(body);

    if (index == null || index < 0 || index >= structuredItems.length) {
      return sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body:
          lang === "arabic"
            ? "من فضلك اختر رقمًا من القائمة أو أرسل *menu*."
            : lang === "hebrew"
            ? "בחר/י מספר בתפריט או כתוב/י *menu*."
            : "Please choose a valid number or type *menu*.",
      });
    }

    const item = structuredItems[index];
    const action = item.action || "custom";
    const payload = item.payload || "";

    return menuService.executeMenuAction({
      action,
      payload,
      biz,
      from,
      customer,
      state,
      lang,
      langKey,
    });
  },
};