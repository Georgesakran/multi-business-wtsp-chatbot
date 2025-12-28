const { sendWhatsApp } = require("../../twilio/sendTwilio");
const parseMenuIndexFromText = require("../../menuControllers/menuUtils/menuParser");
const setState = require("../setState");
const handleBookingSelectDateList = require("./handleBookingSelectDateList");

module.exports = async function handleRescheduleSelectAppointment({
  biz,
  from,
  txt,
  state,
  lang,
  langKey,
}) {
  const idx = parseMenuIndexFromText(txt);
  const appointments = state.data?.appointments || [];

  if (idx == null || idx < 0 || idx >= appointments.length) {
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body:
        lang === "arabic"
          ? "من فضلك اختار/ي رقم صحيح من القائمة."
          : lang === "hebrew"
          ? "בחר/י מספר תקין מהרשימה."
          : "Please select a valid number from the list.",
    });
    return;
  }

  const selectedAppointment = appointments[idx];

  await setState(state, {
    step: "BOOKING_SELECT_DATE_LIST",
    data: {
      ...state.data,
      reschedule: true, // flag for reschedule
      selectedAppointment,
      serviceId: selectedAppointment.serviceId,
      serviceSnapshot: selectedAppointment.snapshot,
    },
  });

  // start booking flow
  await handleBookingSelectDateList({
    biz,
    from,
    lang,
    langKey,
    txt: "", // user will pick date next
    state,
  });
};
