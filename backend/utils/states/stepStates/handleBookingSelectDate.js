const setState = require("../setState");
const { sendWhatsApp } = require("../../twilio/sendTwilio");
const { findServiceById, getTakenMap } = require("../../time/bookingHelpers");
const generateSmartSlots = require("../../time/generateSmartSlots");

// --- helper to split slots into N groups ---
function splitIntoGroups(slots, numGroups = 3) {
  if (!slots.length) return [];
  const groups = [];
  const perGroup = Math.ceil(slots.length / numGroups);

  for (let i = 0; i < numGroups; i++) {
    const startIdx = i * perGroup;
    const endIdx = Math.min((i + 1) * perGroup, slots.length);
    if (startIdx >= slots.length) break;
    const groupSlots = slots.slice(startIdx, endIdx);
    groups.push(`${groupSlots[0]} – ${groupSlots[groupSlots.length - 1]}`);
  }

  return groups;
}

module.exports = async function handleBookingSelectDate({
  biz,
  from,
  lang,
  langKey,
  txt,
  state,
}) {
  const date = txt.trim();
  const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
  if (!isDate(date)) {
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body:
        lang === "arabic"
          ? "📅 من فضلك اكتبي التاريخ بصيغة صحيحة: *YYYY-MM-DD*"
          : lang === "hebrew"
          ? "📅 בבקשה כתבי את התאריך בפורמט *YYYY-MM-DD*"
          : "📅 Please send the date in format *YYYY-MM-DD*",
    });
    return;
  }

  // --- check closed dates ---
  if ((biz.closedDates || []).includes(date)) {
    return sendWhatsApp({ from: biz.wa.number, to: from, body: "❌ Closed" });
  }

  // --- check working days ---
  const bookingCfg = biz.config?.booking || {};
  const workingDays = Array.isArray(bookingCfg.workingDays) ? bookingCfg.workingDays : [];
  const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const weekdayStr = dayNames[new Date(date).getDay()];

  if (!workingDays.includes(weekdayStr)) {
    return sendWhatsApp({ from: biz.wa.number, to: from, body: "❌ Not a working day" });
  }

  const openingTime = bookingCfg.openingTime || "09:00";
  const closingTime = bookingCfg.closingTime || "18:00";

  // --- get already booked slots ---
  const taken = await getTakenMap(biz._id, date);
  const serviceId = state.data?.serviceId;
  const snapshot = state.data?.serviceSnapshot || {};
  const serviceDuration = snapshot.duration || findServiceById(biz, serviceId)?.duration;

  // --- generate free slots ---
  const freeSlots = generateSmartSlots({
    openingTime,
    closingTime,
    serviceDuration: Number(serviceDuration),
    existingBookings: taken,
  });

  if (!freeSlots.length) {
    return sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body:
        lang === "arabic"
          ? "⚠️ في هذا التاريخ لا يوجد أوقات متاحة."
          : lang === "hebrew"
          ? "⚠️ אין שעות פנויות בתאריך הזה."
          : "⚠️ No free time slots on this date.",
    });
  }
  // --- split into 3 groups ---
  const groupedRanges = splitIntoGroups(freeSlots, 3);
  const lines = groupedRanges.map((r, i) => `${i + 1}) ${r}`);

  // --- save state & go to next step ---
  await setState(state, {
    step: "BOOKING_SELECT_TIME_RANGE",
    data: {
      ...state.data,
      date,
      ranges: groupedRanges,
      allSlots: freeSlots,
      openingTime,
      closingTime,
    },
  });
  
  


  // --- send WhatsApp message with ranges ---
  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body:
      lang === "arabic"
        ? `الأوقات المتاحة في *${date}*:\n\n${lines.join(
            "\n"
          )}\n\n💬 أرسلي رقم النطاق الذي ترغبين به`
        : lang === "hebrew"
        ? `השעות הפנויות ב-*${date}*:\n\n${lines.join(
            "\n"
          )}\n\n💬 כתבי את מספר הטווח הרצוי`
        : `Available times on *${date}*:\n\n${lines.join(
            "\n"
          )}\n\n💬 Reply with the number of your preferred range`,
  });
};
