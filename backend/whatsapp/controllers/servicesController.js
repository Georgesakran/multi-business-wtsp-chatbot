// controllers/servicesController.js
const { sendWhatsApp } = require("../services/messaging/twilioService");
const { getLocalized } = require("../utils/i18n");

module.exports = {
  async showServices({ biz, from, langKey }) {
    const services = (biz.services || []).filter(
    (s) => s && s.isActive !== false
    );

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

    const header =
        langKey === "ar"
        ? "✨ *خدماتنا الرئيسية*"
        : langKey === "he"
        ? "✨ *השירותים שלנו*"
        : "✨ *Our main services*";

    const lines = services.map((s, i) => {
        const name = s.name?.[langKey] || s.name?.en || "";
        const desc = s.description?.[langKey] || s.description?.en || "";
        const price =
            typeof s.price === "number" && s.price > 0 ? `${s.price}₪` : "";
        const duration =
            typeof s.duration === "number" && s.duration > 0
                ? langKey === "ar"
                ? `${s.duration} دقيقة`
                : langKey === "he"
                ? `${s.duration} דק׳`
                : `${s.duration} min`
                : "";
            
        return (
            `${i + 1}) 🔹 *${name}*` +
            (price ? ` — ${price}` : "") +
            (duration ? ` • ${duration}` : "") +
            (desc ? `\n   ${desc}` : "")
        );
    });

    const footer =
        langkey === "ar"
        ? "\n💬 أرسلي رقم الخدمة التي تهمك، أو اكتبي *menu* للعودة إلى القائمة."
        : lang === "he"
        ? "\n💬 כתבי את מספר השירות שמעניין אותך, או הקלידי *menu* כדי לחזור לתפריט."
        : "\n💬 Reply with the service number you like, or type *menu* to go back to the main menu.";
  
    await sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: [header, lines.join("\n\n"), footer].join("\n\n"),
    });
  
    return;
  }
};