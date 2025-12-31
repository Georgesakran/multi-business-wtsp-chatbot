const setState = require("../../../utils/states/setState");
const handleBookingSelectDateList = require("../../../utils/states/stepStates/handleBookingSelectDateList");
const handleBookingSelectDate = require("../../../utils/states/stepStates/handleBookingSelectDate");
const getNext10Days = require("../../getNext10Days");
const sendDatePickerTemplate = require("../../twilio/sendDatePickerTemplate");
const moment = require("moment");
const {checkFreeSlotsToday} = require("../../time/bookingHelpers");
const startReschedule = require("./startReschedule");
const {showMenu} = require("../../../routes/twilioFlows/global/commands");
const { sendWhatsApp } = require("../../twilio/sendTwilio");

module.exports = async function chooseChangeType({
  biz,
  from,
  txt,
  lang,
  langKey,
  state,
}) {
  console.log(11111);
  const appt = state.data.selectedAppointment;

  function buildMenuData(data = {}) {
    return {
      language: data.language,
      langKey: data.langKey,
      customerName: data.customerName,
    };
  }

  // command 00
  if (txt === "00") {
    await setState(state, {
      step: state.data.backStep || "RESCHEDULE_SELECT_APPOINTMENT",
      data: {},
    });
    return startReschedule({ biz, from, lang, langKey, state }); 
  }

  // command 99
  if (txt === "99") {
    await setState(state, {
      step: state.data.backStep || "MENU",
      replaceData: true,
      data: buildMenuData(state.data),
    });
    return showMenu({ biz, from, lang, langKey, state });
  }
  // render menu only (no input yet)


 
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

    return handleBookingSelectDate({ biz, from, lang, langKey, txt: appt.date , state });
  }

  if (!txt) {
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body:
        lang === "arabic"
          ? "ماذا تريد التغيير؟\n\n1️⃣ تغيير التاريخ والوقت\n\n2️⃣ تغيير الوقت فقط\n\n0️⃣0️⃣ رجوع\n9️⃣9️⃣ إلغاء والعودة للقائمة"
          : lang === "hebrew"
          ? "מה תרצה לשנות?\n\n1️⃣ שינוי תאריך ושעה\n\n2️⃣ שינוי שעה בלבד\n\n0️⃣0️⃣ חזרה\n9️⃣9️⃣ ביטול וחזרה לתפריט"
          : "What would you like to change?\n\n1️⃣ Change date & time\n\n2️⃣ Change time only\n\n0️⃣0️⃣ Go back\n9️⃣9️⃣ Cancel & back to menu",
    });
    return;
  }
};
