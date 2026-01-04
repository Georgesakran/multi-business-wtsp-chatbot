const setState = require("../setState");
const { sendWhatsApp } = require("../../twilio/sendTwilio");
const { findServiceById, getTakenMap } = require("../../time/bookingHelpers");
const generateSmartSlots = require("../../time/generateSmartSlots");

// -----------------------------
// Helper: split slots into ranges
// -----------------------------
function splitIntoGroups(slots, groupsCount = 3) {
  if (!Array.isArray(slots) || slots.length === 0) return [];

  const groups = [];
  const size = Math.ceil(slots.length / groupsCount);

  for (let i = 0; i < groupsCount; i++) {
    const start = i * size;
    const end = Math.min(start + size, slots.length);
    if (start >= slots.length) break;

    const group = slots.slice(start, end);
    groups.push(`${group[0]} – ${group[group.length - 1]}`);
  }

  return groups;
}

module.exports = async function handleBookingSelectDate({
  biz,
  from,
  lang,
  txt,
  state,
}) {
  const date = String(txt || "").trim();

  // -----------------------------
  // 1️⃣ Validate date format
  // -----------------------------
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body:
        lang === "arabic"
          ? "📅 من فضلك اكتبي التاريخ بصيغة *YYYY-MM-DD*"
          : lang === "hebrew"
          ? "📅 בבקשה כתבי את התאריך בפורמט *YYYY-MM-DD*"
          : "📅 Please send the date in format *YYYY-MM-DD*",
    });
  }

  // -----------------------------
  // 2️⃣ Closed dates
  // -----------------------------
  if ((biz.closedDates || []).includes(date)) {
    return sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: "❌ Closed on this date",
    });
  }

  // -----------------------------
  // 3️⃣ Working day validation (UTC-safe)
  // -----------------------------
  const bookingCfg = biz.config?.booking || {};
  const workingDays = bookingCfg.workingDays || [];

  const weekday = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
  });

  if (!workingDays.includes(weekday)) {
    return sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: "❌ Not a working day",
    });
  }

  const openingTime = bookingCfg.openingTime || "09:00";
  const closingTime = bookingCfg.closingTime || "18:00";

  // -----------------------------
  // 4️⃣ Resolve service duration (HARD GUARD)
  // -----------------------------
  const serviceId = state.data?.serviceId;
  const snapshot = state.data?.serviceSnapshot;

  const serviceDuration =
    Number(snapshot?.duration) ||
    Number(findServiceById(biz, serviceId)?.duration);

  if (!serviceDuration || isNaN(serviceDuration)) {
    console.error("❌ Missing service duration", { serviceId, snapshot });
    return sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: "⚠️ Service duration error. Please restart booking.",
    });
  }

  // -----------------------------
  // 5️⃣ Load & normalize existing bookings
  // -----------------------------
  const takenRaw = await getTakenMap(biz._id, date);
  console.log("takenRaw     :"+takenRaw);

  const taken = takenRaw
    .filter(b =>
      b &&
      typeof b.time === "string" &&
      (b.duratio    console.log("taken     :"+taken);
n || b.serviceSnapshot?.duration)
    )
    .map(b => ({
      time: b.time,
      duration: Number(b.duration || b.serviceSnapshot.duration),
    }))
    .filter(b => !isNaN(b.duration));

  // -----------------------------
  // 6️⃣ Generate free slots
  // -----------------------------
  const freeSlots = generateSmartSlots({
    openingTime,
    closingTime,
    serviceDuration,
    existingBookings: taken,
  });

  if (!freeSlots.length) {
    return sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body:
        lang === "arabic"
          ? "⚠️ لا يوجد أوقات متاحة في هذا اليوم."
          : lang === "hebrew"
          ? "⚠️ אין שעות פנויות ביום זה."
          : "⚠️ No available time slots on this date.",
    });
  }

  // -----------------------------
  // 7️⃣ Group slots into ranges
  // -----------------------------
  const ranges = splitIntoGroups(freeSlots, 3);
  const lines = ranges.map((r, i) => `${i + 1}) ${r}`);

  // -----------------------------
  // 8️⃣ Save state
  // -----------------------------
  await setState(state, {
    step: "BOOKING_SELECT_TIME_RANGE",
    data: {
      ...state.data,
      date,
      ranges,
      allSlots: freeSlots,
    },
  });

  // -----------------------------
  // 9️⃣ Send WhatsApp response
  // -----------------------------
  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body:
      lang === "arabic"
        ? `الأوقات المتاحة في *${date}*:\n\n${lines.join("\n")}\n\n💬 أرسلي رقم النطاق`
        : lang === "hebrew"
        ? `השעות הפנויות ב-*${date}*:\n\n${lines.join("\n")}\n\n💬 כתבי את מספר הטווח`
        : `Available times on *${date}*:\n\n${lines.join("\n")}\n\n💬 Reply with the number of your preferred range`,
  });
};
