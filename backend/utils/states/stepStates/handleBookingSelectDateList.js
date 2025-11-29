const setState = require("../setState");
const { sendWhatsApp } = require("../../twilio/sendTwilio");
const parseMenuIndexFromText = require("../../menuControllers/menuUtils/menuParser");

module.exports = async function handleBookingSelectDateList({
  biz,
  from,
  lang,
  txt,
  state,
}) {
  const days = state.data?.days || [];
  const idx = parseMenuIndexFromText(txt);

  // INVALID INDEX
  if (idx == null || idx < 0 || idx >= days.length) {
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body:
        lang === "arabic"
          ? "من فضلك اختاري رقم تاريخ صحيح من القائمة."
          : lang === "hebrew"
          ? "בחרי מספר תאריך מהרשימה."
          : "Please select a valid date number.",
    });
    return;
  }

  // VALID DATE
  const chosenDate = days[idx];

  // Save chosen date in state and move to next step
  await setState(state, {
    step: "BOOKING_SELECT_DATE",
    data: {
      ...state.data,
      date: chosenDate,
      txtOverride: chosenDate, // optional, next step can use this instead of txt
    },
  });

  // Do NOT use req.body.Body here
  // The next step will read the date from state.data.date or txtOverride
};
