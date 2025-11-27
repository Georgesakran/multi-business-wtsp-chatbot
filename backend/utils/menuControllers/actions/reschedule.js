const sendWhatsApp = require("../../twilio/sendTwilio");

module.exports = async function reschedule({ lang, biz, from }) {
  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body:
      lang === "arabic"
        ? "لتعديل أو إلغاء موعد، أرسل التفاصيل وسنساعدك يدويًا."
        : lang === "hebrew"
        ? "לשינוי/ביטול תור, כתבי את הפרטים ונטפל בזה."
        : "To reschedule or cancel, send us your current booking details.",
  });
};