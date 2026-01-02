// // utils/states/stepStates/handleBookingSelectDate.js

// const setState = require("../setState");
// const { sendWhatsApp } = require("../../twilio/sendTwilio");
// const makeDayGrid = require("../../time/gridHelpers");
// const {findServiceById , isRangeFree, slotsNeeded , getTakenMap, weekdayFromISO} = require("../../time/bookingHelpers");

// module.exports = async function handleBookingSelectDate({
//   biz,
//   from,
//   lang,
//   langKey,
//   txt,
//   state,
// }) {
//   const date = txt.trim();
//   const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));

//   // --- validate format ---
//   if (!isDate(date)) {
//     const msg =
//       lang === "arabic"
//         ? "📅 من فضلك اكتبي التاريخ بصيغة صحيحة: *YYYY-MM-DD* (مثال: 2025-12-05)."
//         : lang === "hebrew"
//         ? "📅 בבקשה כתבי את התאריך בפורמט *YYYY-MM-DD* (לדוגמה: 2025-12-05)."
//         : "📅 Please send the date in format *YYYY-MM-DD* (e.g. 2025-12-05).";

//     await sendWhatsApp({ from: biz.wa.number, to: from, body: msg });
//     return;
//   }

//   const bookingCfg = biz.config?.booking || {};
//   const workingDays = Array.isArray(bookingCfg.workingDays)
//     ? bookingCfg.workingDays
//     : [];

//   const openingTime = bookingCfg.openingTime || "09:00";
//   const closingTime = bookingCfg.closingTime || "18:00";
//   const gap = Number(bookingCfg.slotGapMinutes || 15);
//   console.log("handleBookingSelectDate -> date:", date);

//   // --- closed date? ---
//   if ((biz.closedDates || []).includes(date)) {
//     const msg =
//       lang === "arabic"
//         ? "❌ في هذا التاريخ الصالون مغلق. اختاري تاريخاً آخر."
//         : lang === "hebrew"
//         ? "❌ בתאריך זה העסק סגור. אנא בחרי תאריך אחר."
//         : "❌ The business is closed on that date. Please choose another date.";

//     await sendWhatsApp({ from: biz.wa.number, to: from, body: msg });
//     return;
//   }

//   // --- check weekday ---
//   const weekday = weekdayFromISO(date);
//   if (!workingDays.includes(weekday)) {
//     const msg =
//       lang === "arabic"
//         ? `❌ يوم ${weekday} ليس من أيام العمل. اختاري يوماً آخر.`
//         : lang === "hebrew"
//         ? `❌ יום ${weekday} אינו יום עבודה. בחרי יום אחר.`
//         : `❌ ${weekday} is not a working day. Please choose a different date.`;

//     await sendWhatsApp({ from: biz.wa.number, to: from, body: msg });
//     return;
//   }

//   // --- build daily slots ---
//   const grid = makeDayGrid(openingTime, closingTime, gap);
//   const taken = await getTakenMap(biz._id, date);

//   const serviceId = state.data?.serviceId;
//   const snapshot = state.data?.serviceSnapshot || {};

//   let need = 1;
//   if (snapshot.duration) {
//     need = slotsNeeded(snapshot.duration, gap);
//   } else if (serviceId) {
//     const svc = findServiceById(biz, serviceId);
//     if (svc?.duration) {
//       need = slotsNeeded(Number(svc.duration), gap);
//     }
//   }

//   const free = [];
//   for (let i = 0; i < grid.length; i++) {
//     if (isRangeFree(grid, taken, i, need)) free.push(grid[i]);
//   }

//   if (!free.length) {
//     const msg =
//       lang === "arabic"
//         ? "⚠️ في هذا التاريخ لا يوجد أوقات متاحة. حاولي تاريخاً آخر."
//         : lang === "hebrew"
//         ? "⚠️ אין שעות פנויות בתאריך הזה. נסי תאריך אחר."
//         : "⚠️ There are no free time slots on that date. Please choose another date.";

//     await sendWhatsApp({ from: biz.wa.number, to: from, body: msg });
//     return;
//   }

//   const slotsToShow = free.slice(0, 10);
//   const lines = slotsToShow.map((t, i) => `${i + 1}) ${t}`);

//   // --- save state & go to next step ---
//   await setState(state, {
//     step: "BOOKING_SELECT_TIME",
//     data: {
//       ...state.data,
//       date,
//       slots: slotsToShow,
//       slotGapMinutes: gap,
//       openingTime,
//       closingTime,
//       langKey: state.data?.langKey,
//     },
//   });
  
//   const msg =
//   lang === "arabic"
//     ? `الأوقات المتاحة في *${date}*:\n\nأرسلي رقم الوقت المناسب لك.\n\n${lines.join("\n")}\n\n💬 0️⃣0️⃣ للعودة خطوة للخلف\n9️⃣9️⃣ لإلغاء والعودة للقائمة`
//     : lang === "hebrew"
//     ? `השעות הפנויות ב-*${date}*:\n\nכתבי את מספר השעה המתאימה.\n\n${lines.join("\n")}\n\n💬 0️⃣0️⃣ חזרה צעד אחד\n9️⃣9️⃣ ביטול וחזרה לתפריט`
//     : `Available times on *${date}*:\n\n💬 Please reply with the number of your preferred time.\n\n${lines.join("\n")}\n\n0️⃣0️⃣ Go back one step\n9️⃣9️⃣ Cancel & back to menu`;

//   await sendWhatsApp({ from: biz.wa.number, to: from, body: msg });
// };




const setState = require("../setState");
const { sendWhatsApp } = require("../../twilio/sendTwilio");
const { findServiceById, getTakenMap } = require("../../time/bookingHelpers");
const generateSmartSlots = require("../../time/generateSmartSlots");

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

  // check closed dates & working days
  const weekday = new Date(date).getDay(); // 0 = Sunday
  if ((biz.closedDates || []).includes(date)) {
    return sendWhatsApp({ from: biz.wa.number, to: from, body: "❌ Closed" });
  }

  const bookingCfg = biz.config?.booking || {};
  const workingDays = Array.isArray(bookingCfg.workingDays)
    ? bookingCfg.workingDays
    : [];
  if (!workingDays.includes(weekday)) {
    return sendWhatsApp({ from: biz.wa.number, to: from, body: "❌ Not a working day" });
  }

  const openingTime = bookingCfg.openingTime || "09:00";
  const closingTime = bookingCfg.closingTime || "18:00";

  const taken = await getTakenMap(biz._id, date); // [{start,end}]
  const serviceId = state.data?.serviceId;
  const snapshot = state.data?.serviceSnapshot || {};
  const serviceDuration = snapshot.duration || findServiceById(biz, serviceId)?.duration;

  const free = generateSmartSlots({
    openingTime,
    closingTime,
    serviceDuration: Number(serviceDuration),
    existingBookings: taken,
  });

  if (!free.length) {
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

  const slotsToShow = free.slice(0, 10);
  const lines = slotsToShow.map((t, i) => `${i + 1}) ${t}`);

  await setState(state, {
    step: "BOOKING_SELECT_TIME",
    data: {
      ...state.data,
      date,
      slots: slotsToShow,
      openingTime,
      closingTime,
      slotGapMinutes: bookingCfg.slotGapMinutes || 15,
    },
  });

  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body:
      lang === "arabic"
        ? `الأوقات المتاحة في *${date}*:\n\n${lines.join(
            "\n"
          )}\n\n💬 0️⃣0️⃣ للعودة\n9️⃣9️⃣ لإلغاء`
        : lang === "hebrew"
        ? `השעות הפנויות ב-*${date}*:\n\n${lines.join(
            "\n"
          )}\n\n💬 0️⃣0️⃣ חזרה\n9️⃣9️⃣ ביטול`
        : `Available times on *${date}*:\n\n${lines.join(
            "\n"
          )}\n\n0️⃣0️⃣ Go back\n9️⃣9️⃣ Cancel`,
  });
};

