// controllers/menuController.js

const stateManager = require("../state/stateManager");
const menuService = require("../services/menuService");
const { sendWhatsApp } = require("../services/messaging/twilioService");
const { t } = require("../utils/i18n");

module.exports = {
  /**
   * Show the main menu (multi-language, dynamic)
   */
  showMainMenu: async ({ biz, from, customer, state }) => {
    const lang = customer.language;
    const langKey = customer.language === "arabic"
      ? "ar"
      : customer.language === "hebrew"
      ? "he"
      : "en";

    const menuText = await menuService.buildMenuText(biz, langKey, lang);

    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: menuText,
    });

    await stateManager.setState(state, { step: "MENU" });
  },

  /**
   * Handle user selection from the menu
   */
  handleMenuSelection: async ({ biz, from, customer, state, text }) => {
    const lang = customer.language;
    const langKey = customer.language === "arabic"
      ? "ar"
      : customer.language === "hebrew"
      ? "he"
      : "en";

    const structuredItems = menuService.getVisibleMenuItems(biz);
    const index = menuService.parseMenuIndex(text);

    if (index == null || index < 0 || index >= structuredItems.length) {
      return sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body:
          lang === "arabic"
            ? "من فضلك اختر رقمًا من القائمة أو أرسل *menu* لعرضها."
            : lang === "hebrew"
            ? "בחר/י מספר מהתפריט או כתוב/י *menu*."
            : "Please choose a number from the menu or type *menu*.",
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