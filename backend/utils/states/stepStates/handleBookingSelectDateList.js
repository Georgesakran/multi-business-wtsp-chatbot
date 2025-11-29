const setState  = require("../setState");
const {sendWhatsApp} = require("../../twilio/sendTwilio");
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
      return res.sendStatus(200);
    }
  
    const chosenDate = days[idx];
  
    await setState(state, {
      step: "BOOKING_SELECT_DATE",
      data: {
        ...state.data,
        date: chosenDate,
      },
    });
  
    req.body.Body = chosenDate;  
    //const newTxt = chosenDate;
};
