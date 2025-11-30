// utils/states/stepStates/handleNameConfirmation.js
const { sendWhatsApp } = require("../../twilio/sendTwilio");
const Customer = require("../../../models/Customer");
const setState = require("../setState");

/**
 * Handle name confirmation or update after time selection
 */
module.exports = async function handleNameConfirmation({
  biz,
  from,
  lang,
  langKey,
  txt,
  state,
}) {
  const input = txt?.trim();
  const storedName = state.data?.storedName || "";

  if (!input) return;

  // Determine the actual name
  let actualName = storedName;

  if (input === "0") {
    // Keep existing name
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body:
        lang === "arabic"
          ? `تم الاحتفاظ باسمك الحالي: *${storedName}*`
          : lang === "hebrew"
          ? `השם שלך נשמר: *${storedName}*`
          : `Your current name has been kept: *${storedName}*`,
    });
  } else {
    // Update name in DB
    await Customer.findOneAndUpdate(
      { businessId: biz._id, phone: from },
      { $set: { name: input } }
    );

    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body:
        lang === "arabic"
          ? `تم تحديث اسمك إلى: *${input}*`
          : lang === "hebrew"
          ? `השם שלך עודכן ל: *${input}*`
          : `Your name has been updated to: *${input}*`,
    });

    actualName = input;
  }

  // Update state with actual name and move to booking notes
  await setState(state, {
    step: "BOOKING_ENTER_NOTE",
    data: {
      ...state.data,
      customerName: actualName,
    },
  });

  // Ask for notes
  const noteMsg =
    lang === "arabic"
      ? "5️⃣ هل لديك ملاحظات خاصة؟ اكتب ما تريد، أو اكتب 0 إذا لا توجد."
      : lang === "hebrew"
      ? "5️⃣ יש לך הערות מיוחדות? כתוב מה שצריך, או 0 אם אין."
      : "5️⃣ Any special notes? Write your note, or 0 if none.";

  await sendWhatsApp({ from: biz.wa.number, to: from, body: noteMsg });
};
