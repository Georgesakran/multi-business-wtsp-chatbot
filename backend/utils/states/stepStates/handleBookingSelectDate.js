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

  const taken = takenRaw
    .filter(b =>
      b &&
      typeof b.time === "string" &&
      (b.duration || b.serviceSnapshot?.duration)
    )
    .map(b => ({
      time: b.time,
      duration: Number(b.duration || b.serviceSnapshot.duration),
    }))
    .filter(b => !isNaN(b.duration));




  // -----------------------------
  // 6️⃣ Generate free slots
  // -----------------------------



  const slotObjects = generateSmartSlots({
    openingTime,
    closingTime,
    serviceDuration,
    existingBookings: taken,
  });

  if (!slotObjects.length) {
    return sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: "⚠️ No available time slots on this date.",
    });
  }

  // ✅ Extract ONLY times for ranges
  const slotTimes = slotObjects.map(s => s.time);

  // -----------------------------
  // Emoji logic
  // -----------------------------
  const emojiForScore = score => {
    if (score >= 80) return "⭐";
    if (score >= 40) return "⚡";
    return "⚠️";
  };

  // -----------------------------
  // 7️⃣ Group slots into ranges (USING TIMES)
  // -----------------------------
  const ranges = splitIntoGroups(slotTimes, 3);

  const lines = ranges.map((range, i) => {
    const [rangeStart, rangeEnd] = range.split(" – ");

    // get slots inside this range
    const slotsInRange = slotObjects.filter(
      s => s.time >= rangeStart && s.time <= rangeEnd
    );

    const slotLines = slotsInRange
      .map(s => `${s.time} ${emojiForScore(s.score)}`)
      .join("\n");

    return `${i + 1}) ${range}\n${slotLines}`;
  });

  // -----------------------------
  // 8️⃣ Save state (TIMES ONLY)
  // -----------------------------
  await setState(state, {
    step: "BOOKING_SELECT_TIME_RANGE",
    data: {
      ...state.data,
      date,
      ranges,
      allSlots: slotTimes, // IMPORTANT
    },
  });

  // -----------------------------
  // 9️⃣ Send WhatsApp response
  // -----------------------------
  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body:
      `Available times on *${date}*:\n\n${lines.join("\n\n")}\n\n` +
      `💬 Reply with the number of your preferred range`,
  });
};