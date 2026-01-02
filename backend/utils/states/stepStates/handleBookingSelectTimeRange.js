const setState = require("../setState");
const { sendWhatsApp } = require("../../twilio/sendTwilio");

// --- helper to filter slots inside a range ---
function filterSlotsInRange(slots, rangeStr) {
  const [start, end] = rangeStr.split(" – ");
  return slots.filter((t) => t >= start && t <= end);
}

module.exports = async function handleBookingSelectTimeRange({
  biz,
  from,
  lang,
  langKey,
  txt,
  state,
}) {
  const choice = txt.trim();
  const ranges = state.data?.ranges || [];
  const allSlots = state.data?.allSlots || []; // store all free slots from previous step

  // --- validate choice ---
  const idx = parseInt(choice, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= ranges.length) {
    return sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body:
        lang === "arabic"
          ? "❌ الرجاء إرسال رقم صحيح من القائمة."
          : lang === "hebrew"
          ? "❌ אנא כתבי מספר תקין מהרשימה."
          : "❌ Please send a valid number from the list.",
    });
  }

  
  // --- get exact slots in chosen range ---
  const chosenRange = ranges[idx];
  const availableSlots = filterSlotsInRange(allSlots, chosenRange);

  // --- format slots for WhatsApp message ---
  const lines = availableSlots.map((t, i) => `${i + 1}) ${t}`);

  // --- save state for next step ---
  await setState(state, {
    step: "BOOKING_SELECT_TIME",
    data: {
      ...state.data,
      chosenRange,
      slots: availableSlots,
    },
  });

  // --- send WhatsApp message with exact slots ---
  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body:
      lang === "arabic"
        ? `الأوقات الدقيقة ضمن النطاق *${chosenRange}*:\n\n${lines.join(
            "\n"
          )}\n\n💬 أرسلي رقم الوقت الذي ترغبين به`
        : lang === "hebrew"
        ? `השעות המדויקות בטווח *${chosenRange}*:\n\n${lines.join(
            "\n"
          )}\n\n💬 כתבי את מספר השעה הרצויה`
        : `Exact times in the range *${chosenRange}*:\n\n${lines.join(
            "\n"
          )}\n\n💬 Reply with the number of your preferred time`,
  });
};
