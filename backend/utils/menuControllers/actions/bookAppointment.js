const { sendWhatsApp } = require("../../twilio/sendTwilio");
const setState = require("../../states/setState");

module.exports = async function bookAppointment({ lang, langKey, biz, state, from }) {
  if (!biz.enabledServices?.includes("bookingFlow")) {
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body:
        lang === "arabic"
          ? "حالياً هذا النشاط لا يدعم حجز المواعيد عبر الواتساب."
          : lang === "hebrew"
          ? "לעסק הזה אין מערכת תורים דרך הצ'אט."
          : "This business does not support booking appointments via WhatsApp yet.",
    });
    return;
  }

  const services = (biz.services || []).filter(
    (s) => s && s.isActive !== false && s.bookable !== false
  );

  if (!services.length) {
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body:
        lang === "arabic"
          ? "لا توجد خدمات للحجز مضافة حالياً."
          : lang === "hebrew"
          ? "אין כרגע שירותים זמינים לחיוב תורים."
          : "There are no bookable services configured yet.",
    });
    return;
  }

  const key = langKey;

  const intro =
    lang === "arabic"
      ? "تمام! نبدأ الحجز بخطوات بسيطة 👇"
      : lang === "hebrew"
      ? "מעולה! נתחיל הזמנה בכמה שלבים פשוטים 👇"
      : "Great! Let’s start your booking 👇";

  const header =
    lang === "arabic"
      ? "1️⃣ *اختار/ي الخدمة المطلوبة*"
      : lang === "hebrew"
      ? "1️⃣ *בחר/י את השירות*"
      : "1️⃣ *Choose a service*";

  const lines = services.map((s, i) => {
    const name = s.name?.[key] || s.name?.en || "";
    const desc = s.description?.[key] || s.description?.en || "";
    const price = s.price ? `${s.price}₪` : "";
    const duration = s.duration ? `${s.duration} min` : "";
    return `${i + 1}) 🔹 *${name}* ${price ? "— " + price : ""} ${duration ? " • " + duration : ""}${desc ? "\n   " + desc : ""}`;
  });

  const footer =
    lang === "arabic"
      ? "\n💬 أرسلي رقم الخدمة التي تريدين حجزها."
      : lang === "hebrew"
      ? "\n💬 כתבי את מספר השירות שברצונך להזמין."
      : "\n💬 Send the number of the service you want.";

  await setState(state, {
    step: "BOOKING_SELECT_SERVICE",
    data: { serviceIds: services.map((s) => String(s._id)) },
  });

  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body: [intro, header, lines.join("\n\n"), footer].join("\n\n"),
  });
};