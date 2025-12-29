// utils/states/stepStates/handleBookingSelectDateList.js

const setState  = require("../setState");
const {sendWhatsApp} = require("../../twilio/sendTwilio");
const parseMenuIndexFromText = require("../../menuControllers/menuUtils/menuParser");
const handleBookingSelectDate = require("./handleBookingSelectDate"); // import the next step

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
  console.log("+idx : "+idx);

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

  const chosenDate = days[idx];

  // --- update state ---
  await setState(state, {
    step: "BOOKING_SELECT_DATE",
    data: {
      ...state.data,
      date: chosenDate,
      langKey: state.data?.langKey,
    },
  });
  
  console.log("handleBookingSelectDateList -> chosenDate:", chosenDate);

  // --- immediately call handleBookingSelectDate to continue the flow ---
  await handleBookingSelectDate({
    biz,
    from,
    lang,
    langKey,
    txt: chosenDate, // pass the selected date as txt
    state,
  });
};
