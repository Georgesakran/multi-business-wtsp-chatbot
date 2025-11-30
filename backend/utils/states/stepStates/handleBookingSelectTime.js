// utils/states/stepStates/handleBookingSelectTime.js
const { sendWhatsApp } = require("../../twilio/sendTwilio");
const parseMenuIndexFromText = require("../../menuControllers/menuUtils/menuParser");
const Customer = require("../../../models/Customer");

/**
 * Handle user selecting a time slot in booking
 */
module.exports = async function handleBookingSelectTime({
  biz,
  from,
  lang,
  langKey,
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

    await sendWhatsApp({ from: biz.wa.number, to: from, body });
    return;
  }

  // VALID TIME
  const time = slots[idx];

  // Fetch customer to check name
  let customer = await Customer.findOne({ businessId: biz._id, phone: from });
  const name = customer?.name || "";

  // CASE 1: no name yet
  if (!name) {
    await setState(state, {
      step: "BOOKING_ENTER_NAME",
      data: {
        ...state.data,
        time,
        langKey,
      },
    });

    const msg =
      lang === "arabic"
        ? `✅ تم اختيار الوقت: *${time}*\n\n4️⃣ نحتاج اسمك الكامل للحجز.`
        : lang === "hebrew"
        ? `✅ נבחרה שעה: *${time}*\n\n4️⃣ אנא הזן את שמך המלא להזמנה.`
        : `✅ Time selected: *${time}*\n\n4️⃣ We need your full name for the booking.`;

    await sendWhatsApp({ from: biz.wa.number, to: from, body: msg });
    return;
  }

  // CASE 2 & 3: name exists → wait for confirmation / update
  await setState(state, {
    step: "AWAITING_NAME_CONFIRM",
    data: {
      ...state.data,
      time,
      langKey,
      storedName: name, // save existing name
    },
  });

  const msg =
    lang === "arabic"
      ? `✅ تم اختيار الوقت: *${time}*\nاسمك الكامل المسجل: *${name}*\nاكتب 0 إذا كنت تريد الاحتفاظ بالاسم أو اكتب اسمك الكامل إذا أردت تغييره.`
      : lang === "hebrew"
      ? `✅ נבחרה שעה: *${time}*\nהשם המלא שלך: *${name}*\nהקלד 0 אם ברצונך לשמור על השם או הקלד שם מלא חדש כדי לשנות.`
      : `✅ Time selected: *${time}*\nYour full name: *${name}*\nType 0 to keep it, or type your full name to update.`;

  await sendWhatsApp({ from: biz.wa.number, to: from, body: msg });
};
