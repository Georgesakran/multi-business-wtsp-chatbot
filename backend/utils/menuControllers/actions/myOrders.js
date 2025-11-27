const {sendWhatsApp} = require("../../twilio/sendTwilio");

module.exports = async function myOrders({ lang, biz, from }) {
  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body:
      lang === "arabic"
        ? "عرض طلباتك غير مفعّل بعد."
        : lang === "hebrew"
        ? "צפייה בהזמנות עדיין לא זמינה."
        : "Order history not available yet.",
  });
};