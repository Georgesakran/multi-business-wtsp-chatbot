const {sendWhatsApp} = require("../../twilio/sendTwilio");

module.exports = async function viewServices({ lang, langKey, biz, from }) {
  const services = (biz.services || []).filter((s) => s && s.isActive !== false);

  if (!services.length) {
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body:
        lang === "arabic"
          ? "لا توجد خدمات مضافة بعد."
          : lang === "hebrew"
          ? "עדיין לא הוגדרו שירותים."
          : "No services defined yet.",
    });
    return;
  }

  const key = langKey;

  const header =
    lang === "arabic"
      ? "✨ *خدماتنا*"
      : lang === "hebrew"
      ? "✨ *השירותים שלנו*"
      : "✨ *Our Services*";

  const lines = services.map((s, i) => {
    const name = s.name?.[key] || s.name?.en;
    const desc = s.description?.[key] || s.description?.en;
    return `${i + 1}) 🔹 *${name}*\n   ${desc}`;
  });

  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body: `${header}\n\n${lines.join("\n\n")}`,
  });
};