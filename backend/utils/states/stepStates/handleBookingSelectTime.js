const Customer = require("../../../models/Customer");
const { sendWhatsApp } = require("../../twilio/sendTwilio");
const parseMenuIndexFromText = require("../../menuControllers/menuUtils/menuParser");

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

  // Save time in state
  await setState(state, {
    step: "BOOKING_ENTER_NAME",
    data: {
      ...state.data,
      time,
      langKey,
    },
  });

  // Check if customer exists and has a name
  const customer = await Customer.findOne({ businessId: biz._id, phone: from });
  let msg;

  if (customer?.name) {
    msg =
      lang === "arabic"
        ? `✅ تم اختيار الوقت: *${time}*\n\nاسمك الحالي هو: *${customer.name}*\nهل تريد تغييره؟ إذا أردت الاحتفاظ به اكتب *0*، وإذا أردت تغييره اكتب الاسم الكامل الجديد.`
        : lang === "hebrew"
        ? `✅ נבחרה שעה: *${time}*\n\nהשם שלך כרגע הוא: *${customer.name}*\nרוצה לשנות אותו? כדי לשמור את השם הקיים כתוב *0*, כדי לשנות כתוב שם מלא חדש.`
        : `✅ Time selected: *${time}*\n\nYour current name is: *${customer.name}*\nDo you want to change it? Type *0* to keep it, or enter a new full name to update.`;
  } else {
    msg =
      lang === "arabic"
        ? `✅ تم اختيار الوقت: *${time}*\n\n4️⃣ اكتب/ي اسمك الكامل للحجز.`
        : lang === "hebrew"
        ? `✅ נבחרה שעה: *${time}*\n\n4️⃣ כתב/י את שמך המלא להזמנה.`
        : `✅ Time selected: *${time}*\n\n4️⃣ Please send your full name for the booking.`;
  }

  await sendWhatsApp({ from: biz.wa.number, to: from, body: msg });
};
