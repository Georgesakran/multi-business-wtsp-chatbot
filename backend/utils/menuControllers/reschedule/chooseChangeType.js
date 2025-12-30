const setState = require("../../../utils/states/setState");
const handleBookingSelectDateList = require("../../../utils/states/stepStates/handleBookingSelectDateList");
const handleBookingSelectTime = require("../../../utils/states/stepStates/handleBookingSelectTime");
const getNext10Days = require("../../getNext10Days");
const sendDatePickerTemplate = require("../../twilio/sendDatePickerTemplate");
const moment = require("moment");
const {checkFreeSlotsToday} = require("../../time/bookingHelpers");



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
    await setState(state, {
      step: state.data.backStep || "RESCHEDULE_SELECT_APPOINTMENT",
      data: {},
    });
    return;
  }
  

  if (txt === "1") {
        // 6) Prepare next 10 days
        const rawDays = getNext10Days(biz);
        let days = [...rawDays];
    
        const todayStr = moment().format("YYYY-MM-DD");
        if (days.includes(todayStr)) {
          const hasFree = await checkFreeSlotsToday(biz);
          if (!hasFree) {
            days = days.filter((d) => d !== todayStr);
          }
        }
        await setState(state, {
          step: "BOOKING_SELECT_DATE_LIST",
          data: {
            reschedule: true,
            bookingId: appt._id,
            serviceId: appt.serviceId,
            serviceSnapshot: appt.serviceSnapshot,
            days,
            backStep: "RESCHEDULE_CHOOSE_CHANGE_TYPE",
          },
        });
        
    await sendDatePickerTemplate(biz, from, days, lang);

    //return handleBookingSelectDateList({ biz, from, lang, langKey, txt: "", state });
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
        backStep: "RESCHEDULE_CHOOSE_CHANGE_TYPE",
      },
    });

    return handleBookingSelectTime({ biz, from, lang, langKey, txt: "", state });
  }
};
