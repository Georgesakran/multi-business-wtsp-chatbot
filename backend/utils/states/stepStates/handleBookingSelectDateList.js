const setState  = require("../setState");
const {sendWhatsApp} = require("../../twilio/sendTwilio");

module.exports = async function handleBookingSelectDateList({
  biz,
  from,
  lang,
  langKey,
  txt,
  state,
}) {
  const days = state.data?.days || [];
  const chosenDate = txt.trim();

  // Validate chosen date is one of the options
  if (!days.includes(chosenDate)) {
    const msg =
      lang === "arabic"
        ? "❌ يرجى اختيار تاريخ من القائمة."
        : lang === "hebrew"
        ? "❌ אנא בחרי תאריך מהרשימה."
        : "❌ Please select a date from the list.";

    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: msg,
    });

    return;
  }

  // Save chosen date to state
  await setState(state, {
    step: "BOOKING_SELECT_DATE",
    data: {
      ...state.data,
      date: chosenDate,
    },
  });

  // We keep the message the same (date)
  // The next handler (BOOKING_SELECT_DATE) will continue
  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body:
      lang === "arabic"
        ? `📅 تم اختيار التاريخ: *${chosenDate}*\n\nالآن أرسلي التاريخ مرة أخرى أو تابعي العملية.`
        : lang === "hebrew"
        ? `📅 נבחר תאריך: *${chosenDate}*\n\nעכשיו כתבי את התאריך שוב כדי להמשיך.`
        : `📅 Date selected: *${chosenDate}*\n\nPlease send the date again to continue.`,
  });
};
