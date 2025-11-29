const setState = require("../setState");
const { sendWhatsApp } = require("../../twilio/sendTwilio");
const parseMenuIndexFromText = require("../../menuControllers/menuUtils/menuParser");

module.exports = async function handleBookingSelectDateList({
  biz,
  from,
  lang,
  langKey,
  txt,
  state,
}) {
  const days = state.data?.days || [];
  const idx = parseMenuIndexFromText(txt);

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
    return; // no res.sendStatus here in helpers
  }

  const chosenDate = days[idx];

  await setState(state, {
    step: "BOOKING_SELECT_DATE",
    data: {
      ...state.data,
      date: chosenDate,
      txtOverride: chosenDate, // store the chosen date so the next step can use it
    },
  });

  // next step handler should use state.data.txtOverride instead of req.body.Body
};
