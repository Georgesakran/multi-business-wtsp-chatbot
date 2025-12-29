const { sendWhatsApp } = require("../../twilio/sendTwilio");
const getConfigMessage = require("../../config/configMessageHelper");

module.exports = async function reschedule({ lang, langKey, biz, from, payload }) {
  const owner = biz.owner || {};
  const phone =
    payload || owner.phone || biz.whatsappNumber || biz.wa?.number || "";

  // Default fallback text (if business didn't customize it)
  const fallback =
    lang === "arabic"
      ? "لتعديل أو إلغاء موعد، أرسل/ي لنا:\n- اسمك\n- التاريخ\n- الساعة\nوسنساعدك يدويًا ✅"
      : lang === "hebrew"
      ? "כדי לשנות/לבטל תור, שלח/י:\n- שם\n- תאריך\n- שעה\nונעזור ידנית ✅"
      : "To reschedule/cancel, please send:\n- Your name\n- Date\n- Time\nand we’ll help manually ✅";

  // Allow business custom message by config (per language)
  const msg = getConfigMessage(biz, langKey, "reschedule", fallback);

  const contactLine = phone
    ? lang === "arabic"
      ? `\n\n📞 أو اتصل/ي بنا: ${phone}`
      : lang === "hebrew"
      ? `\n\n📞 או התקשר/י אלינו: ${phone}`
      : `\n\n📞 Or call us: ${phone}`
    : "";

  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body: msg + contactLine,
  });
};