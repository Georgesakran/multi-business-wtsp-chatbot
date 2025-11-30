const {sendWhatsApp} = require("../../twilio/sendTwilios");

/**
 * Handle the step where the user enters their full name
 */
module.exports = async function handleBookingEnterName({
  biz,
  from,
  lang,
  txt,
  state,
  setState,
}) {
  const name = txt?.trim();

  // Validate
  if (!name || name.length < 2) {
    const body =
      lang === "arabic"
        ? "من فضلك اكتب/ي اسمًا واضحًا (على الأقل حرفين)."
        : lang === "hebrew"
        ? "נא לכתוב שם ברור (לפחות שני תווים)."
        : "Please send a clear name (at least 2 characters).";

    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body,
    });

    return;
  }

  // Store the name → move to next step
  await setState(state, {
    step: "BOOKING_ENTER_NOTE",
    data: {
      ...state.data,
      customerName: name,
    },
  });

  // Ask for notes
  const msg =
    lang === "arabic"
      ? "5️⃣ هل لديك ملاحظات خاصة !! (مثال: لون/شكل/معلومة إضافية)؟\nاكتب/ي ما تريدين، أو اكتب/ي *0* إذا لا توجد ملاحظات."
      : lang === "hebrew"
      ? "5️⃣ יש לך הערות מיוחדות (צבע, צורה, בקשה נוספת)?\nכתב/י מה שצריך, או כתב/י *0* אם אין הערות."
      : "5️⃣ Any special notes (e.g. style, color, anything extra)?\nWrite your note, or send *0* if you have no notes.";

  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body: msg,
  });
};
