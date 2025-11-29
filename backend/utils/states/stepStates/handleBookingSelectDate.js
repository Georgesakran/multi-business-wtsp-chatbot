const setState = require("../setState");
const { sendWhatsApp } = require("../../twilio/sendTwilio");
const makeDayGrid = require("../helpers/gridHelpers");
const { getTakenMap, slotsNeeded, findServiceById, isRangeFree } = require("../helpers/bookingHelpers");
const weekdayFromISO = require("../helpers/weekdayFromISO");

module.exports = async function handleBookingSelectDate({
  biz,
  from,
  lang,
  langKey,
  txt,
  state,
}) {
  const date = state.data?.txtOverride || txt; // use override if set
  const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));

  if (!isDate(date)) {
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body:
        lang === "arabic"
          ? "📅 من فضلك اكتبي التاريخ بصيغة صحيحة: *YYYY-MM-DD* (مثال: 2025-12-05)."
          : lang === "hebrew"
          ? "📅 בבקשה כתבי את התאריך בפורמט *YYYY-MM-DD* (לדוגמה: 2025-12-05)."
          : "📅 Please send the date in format *YYYY-MM-DD* (e.g. 2025-12-05).",
    });
    return;
  }

  const bookingCfg = biz.config?.booking || {};
  const workingDays = Array.isArray(bookingCfg.workingDays) ? bookingCfg.workingDays : [];
  const openingTime = bookingCfg.openingTime || "09:00";
  const closingTime = bookingCfg.closingTime || "18:00";
  const gap = Number(bookingCfg.slotGapMinutes || 15);

  if ((biz.closedDates || []).includes(date)) {
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body:
        lang === "arabic"
          ? "❌ في هذا التاريخ الصالون مغلق. اختاري تاريخاً آخر."
          : lang === "hebrew"
          ? "❌ בתאריך זה העסק סגור. אנא בחרי תאריך אחר."
          : "❌ The business is closed on that date. Please choose another date.",
    });
    return;
  }

  const weekday = weekdayFromISO(date);
  if (!workingDays.includes(weekday)) {
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body:
        lang === "arabic"
          ? `❌ يوم ${weekday} ليس من أيام العمل. اختاري يوماً آخر.`
          : lang === "hebrew"
          ? `❌ יום ${weekday} אינו יום עבודה. בחרי יום אחר.`
          : `❌ ${weekday} is not a working day. Please choose a different date.`,
    });
    return;
  }

  const grid = makeDayGrid(openingTime, closingTime, gap);
  const taken = await getTakenMap(biz._id, date);

  const serviceId = state.data?.serviceId;
  const snapshot = state.data?.serviceSnapshot || {};
  let need = 1;
  if (snapshot.duration) {
    need = slotsNeeded(snapshot.duration, gap);
  } else if (serviceId) {
    const svc = findServiceById(biz, serviceId);
    if (svc?.duration) need = slotsNeeded(Number(svc.duration), gap);
  }

  const free = [];
  for (let i = 0; i < grid.length; i++) {
    if (isRangeFree(grid, taken, i, need)) free.push(grid[i]);
  }

  if (!free.length) {
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body:
        lang === "arabic"
          ? "⚠️ في هذا التاريخ لا يوجد أوقات متاحة. حاولي تاريخاً آخر."
          : lang === "hebrew"
          ? "⚠️ אין שעות פנויות בתאריך הזה. נסי תאריך אחר."
          : "⚠️ There are no free time slots on that date. Please choose another date.",
    });
    return;
  }

  const slotsToShow = free.slice(0, 10); // show up to 10 options
  const lines = slotsToShow.map((t, i) => `${i + 1}) ${t}`);

  await setState(state, {
    step: "BOOKING_SELECT_TIME",
    data: {
      ...state.data,
      date,
      slots: slotsToShow,
      slotGapMinutes: gap,
      openingTime,
      closingTime,
    },
  });

  const msg =
    lang === "arabic"
      ? `3️⃣ الأوقات المتاحة في *${date}*:\n\n${lines.join("\n")}\n\n💬 أرسلي رقم الوقت المناسب لك.`
      : lang === "hebrew"
      ? `3️⃣ השעות הפנויות ב-*${date}*:\n\n${lines.join("\n")}\n\n💬 כתבי את מספר השעה המתאימה.`
      : `3️⃣ Available times on *${date}*:\n\n${lines.join("\n")}\n\n💬 Please reply with the number of your preferred time.`;

  await sendWhatsApp({ from: biz.wa.number, to: from, body: msg });
};
