const sendWhatsApp = require("../../twilio/sendTwilio");

module.exports = async function followInstagram({ lang, payload, biz, from }) {
  const url = payload || "";

  const body =
    lang === "arabic"
      ? `📸 تابعنا:\n${url || "الرابط غير مضاف."}`
      : lang === "hebrew"
      ? `📸 עקבי אחרינו:\n${url || "קישור לא הוגדר."}`
      : `📸 Follow us:\n${url || "Link not configured yet."}`;

  await sendWhatsApp({ from: biz.wa.number, to: from, body });
};