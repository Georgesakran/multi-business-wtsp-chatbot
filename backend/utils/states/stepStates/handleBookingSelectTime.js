// utils/states/stepStates/handleBookingSelectTime.js

const {sendWhatsApp} = require("../../twilio/sendTwilio");
const parseMenuIndexFromText = require("../../menuControllers/menuUtils/menuParser");

/**
 * Handle user selecting a time slot in booking
 */
module.exports = async function handleBookingSelectTime({
  biz,
  from,
  lang,
  txt,
  state,
  setState,
}) {
  const slots = state.data?.slots || [];
  const idx = parseMenuIndexFromText(txt);

  // INVALID INDEX → Show list again
  if (idx == null || idx < 0 || idx >= slots.length) {
    const lines = slots.map((t, i) => `${i + 1}) ${t}`);

    const body =
      lang === "arabic"
        ? `من فضلك اختار/ي رقمًا من الأوقات:\n\n${lines.join(
            "\n"
          )}\n\nأو اكتب/ي *menu* للعودة.`
        : lang === "hebrew"
        ? `בחר/י מספר מתוך השעות הבאות:\n\n${lines.join(
            "\n"
          )}\n\nאו כתב/י *menu* כדי לחזור.`
        : `Please choose a number from these times:\n\n${lines.join(
            "\n"
          )}\n\nOr type *menu* to go back.`;

    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body,
    });

    return;
  }

  // VALID TIME
  const time = slots[idx];

  await setState(state, {
    step: "BOOKING_ENTER_NAME",
    data: {
      ...state.data,
      time,
    },
  });

  const msg =
    lang === "arabic"
      ? `✅ تم اختيار الوقت: *${time}*\n\n4️⃣ اكتب/ي اسمك الكامل للحجز.`
      : lang === "hebrew"
      ? `✅ נבחרה שעה: *${time}*\n\n4️⃣ כתב/י את שמך המלא להזמנה.`
      : `✅ Time selected: *${time}*\n\n4️⃣ Please send your full name for the booking.`;

  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body: msg,
  });
};
