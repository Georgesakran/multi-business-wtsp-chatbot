// controllers/menuController.js
const menuService = require("../services/menuService");
const customerService = require("../services/customerService");
const { sendWhatsApp } = require("../services/messaging/twilioService");

module.exports = {
  // Display menu
  showMenu: async ({ biz, customer, from }) => {
    const lang = customer.language;
    const langKey = customerService.langKey(customer.language);

    const menu = menuService.buildMenuText(biz, langKey, lang);

    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: menu,
    });
  },

  // Process selection
  handleMenuSelection: async ({ biz, customer, state, text, from }) => {
    const items = menuService.getVisibleMenuItems(biz);
    const index = menuService.parseMenuIndex(text);

    if (index == null || index < 0 || index >= items.length) {
      await sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: "⚠️ Invalid option. Send *menu*.",
      });
      return;
    }

    const item = items[index];

    await menuService.handleMenuAction({
      action: item.action,
      payload: item.payload,
      biz,
      customer,
      state,
      from,
      text,
    });
  },
};