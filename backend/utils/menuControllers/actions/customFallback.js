const { sendWhatsApp } = require("../../utils/twilio/sendTwilio");

module.exports = async function customFallback({ lang, biz, from }) {
  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body:
      lang === "arabic"
        ? "هذا الخيار غير متاح بعد."
        : lang === "hebrew"
        ? "האפשרות הזו עדיין לא פעילה."
        : "This option is not available yet.",
  });
};