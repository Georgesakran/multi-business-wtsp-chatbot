const setState = require("../../utils/states/setState");
const handleBookingSelectDateList = require("../../utils/states/stepStates/handleBookingSelectDateList");
const handleBookingSelectTime = require("../../utils/states/stepStates/handleBookingSelectTime");

module.exports = async function chooseChangeType({
  biz,
  from,
  txt,
  lang,
  langKey,
  state,
}) {
  const appt = state.data.selectedAppointment;

  if (txt === "0") {
    await setState(state, { step: "MENU", data: {} });
    return;
  }

  if (txt === "1") {
    await setState(state, {
      step: "BOOKING_SELECT_DATE_LIST",
      data: {
        reschedule: true,
        bookingId: appt._id,
        serviceId: appt.serviceId,
        serviceSnapshot: appt.serviceSnapshot,
      },
    });

    return handleBookingSelectDateList({ biz, from, lang, langKey, txt: "", state });
  }

  if (txt === "2") {
    await setState(state, {
      step: "BOOKING_SELECT_TIME",
      data: {
        reschedule: true,
        bookingId: appt._id,
        serviceId: appt.serviceId,
        serviceSnapshot: appt.serviceSnapshot,
        selectedDate: appt.date,
      },
    });

    return handleBookingSelectTime({ biz, from, lang, langKey, txt: "", state });
  }
};
