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

    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body,
    });

    return;
  }

  // VALID TIME
  const time = slots[idx];

  // Fetch customer to check if we already have their name
  const customer = await Customer.findOne({ businessId: biz._id, phone: from });
  const name = customer?.name || "";

  // Decide step and message
  let step = "AWAITING_NAME_CONFIRM"; // new step for confirming name
  let msg = "";

  if (name) {
    msg =
      lang === "arabic"
        ? `✅ تم اختيار الوقت: *${time}*\nاسمك الكامل المسجل: *${name}*\nاكتب 0 إذا كنت تريد الاحتفاظ بالاسم أو اكتب اسمك الكامل إذا أردت تغييره.`
        : lang === "hebrew"
        ? `✅ נבחרה שעה: *${time}*\nהשם המלא שלך: *${name}*\nהקלד 0 אם ברצונך לשמור על השם או הקלד שם מלא חדש כדי לשנות.`
        : `✅ Time selected: *${time}*\nYour full name: *${name}*\nType 0 to keep it, or type your full name to update.`;
  } else {
    step = "AWAITING_NAME"; // fallback for entering name first time
    msg =
      lang === "arabic"
        ? `✅ تم اختيار الوقت: *${time}*\n\n4️⃣ اكتب/ي اسمك الكامل للحجز.`
        : lang === "hebrew"
        ? `✅ נבחרה שעה: *${time}*\n\n4️⃣ כתב/י את שמך המלא להזמנה.`
        : `✅ Time selected: *${time}*\n\n4️⃣ Please send your full name for the booking.`;
  }

  // Update state
  await setState(state, {
    step,
    data: {
      ...state.data,
      time,
      langKey,
    },
  });

  // Send message
  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body: msg,
  });
};
