const { sendWhatsApp } = require("../../utils/twilio/sendTwilio");

module.exports = async function aboutLocation({ lang, biz, from }) {
  const loc = biz.location || {};

  const body =
    lang === "arabic"
      ? `📍 عن الصالون:\nالمدينة: ${loc.city || "-"}\nالشارع: ${loc.street || "-"}`
      : lang === "hebrew"
      ? `📍 על הסלון:\nעיר: ${loc.city || "-"}\nרחוב: ${loc.street || "-"}`
      : `📍 About the salon:\nCity: ${loc.city || "-"}\nStreet: ${loc.street || "-"}`;

  await sendWhatsApp({ from: biz.wa.number, to: from, body });
};