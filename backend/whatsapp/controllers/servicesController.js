// controllers/servicesController.js
const { sendWhatsApp } = require("../services/messaging/twilioService");
const { getLocalized } = require("../utils/i18n");

module.exports = {
  async showServices({ biz, from, langKey }) {
    const services = biz.services || [];

    if (!services.length) {
      return sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body:
          langKey === "ar"
            ? "⚠️ لا يوجد خدمات متاحة حالياً."
            : langKey === "he"
            ? "⚠️ אין שירותים זמינים כרגע."
            : "⚠️ No services available at the moment."
      });
    }

    let msg =
      langKey === "ar"
        ? "💆‍♀️ *قائمة الخدمات:*\n\n"
        : langKey === "he"
        ? "💆‍♀️ *רשימת השירותים:*\n\n"
        : "💆‍♀️ *Our Services:*\n\n";

    services.forEach((srv, i) => {
      const name = getLocalized(srv.name, langKey);
      const price = srv.price ? `${srv.price}₪` : "";
      msg += `${i + 1}) ${name} ${price}\n`;
    });

    await sendWhatsApp({ from: biz.wa.number, to: from, body: msg });
  }
};