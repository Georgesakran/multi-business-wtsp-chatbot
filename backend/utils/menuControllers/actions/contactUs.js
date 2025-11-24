const { sendWhatsApp } = require("../../utils/twilio/sendTwilio");

module.exports = async function contactUs({ lang, biz, from }) {
  const owner = biz.owner || {};

  const body =
    lang === "arabic"
      ? `📞 تواصل معنا:\nهاتف: ${owner.phone || "-"}\nإيميل: ${owner.email || "-"}`
      : lang === "hebrew"
      ? `📞 צרי קשר:\nטלפון: ${owner.phone || "-"}\nאימייל: ${owner.email || "-"}`
      : `📞 Contact us:\nPhone: ${owner.phone || "-"}\nEmail: ${owner.email || "-"}`;

  await sendWhatsApp({ from: biz.wa.number, to: from, body });
};