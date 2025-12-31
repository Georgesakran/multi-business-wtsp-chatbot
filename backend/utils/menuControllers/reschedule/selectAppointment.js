const { sendWhatsApp } = require("../../twilio/sendTwilio");
const setState = require("../../../utils/states/setState");
const {showMenu} = require("../../../routes/twilioFlows/global/commands");

module.exports = async function selectAppointment({
  biz,
  from,
  txt,
  state,
  lang,
  langKey,
}) {


  function buildMenuData(data = {}) {
    return {
      language: data.language,
      langKey: data.langKey,
      customerName: data.customerName,
    };
  }

  if (txt === "00") {
    await setState(state, {
      step: state.data.backStep || "MENU",
      replaceData: true,
      data: buildMenuData(state.data),
    });
    return showMenu({ biz, from, lang, langKey, state });
  }
  
  
  const idx = parseInt(txt, 10) - 1;
  const appointments = state.data?.appointments || [];


  if (isNaN(idx) || !appointments[idx]) {
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body:
        lang === "arabic"
          ? "اختر رقمًا صحيحًا من القائمة."
          : lang === "hebrew"
          ? "בחר מספר תקין."
          : "Please select a valid number.",
    });
    return;
  }


  await setState(state, {
    step: "RESCHEDULE_CHOOSE_CHANGE_TYPE",
    replaceData: true,
    data: {
      selectedAppointment: appointments[idx],
      backStep: "RESCHEDULE_SELECT_APPOINTMENT",
      language: state.data.language,
      langKey: state.data.langKey,
      customerName: state.data.customerName,
    },
  });
  

  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body:
      lang === "arabic"
        ? "ماذا تريد التغيير؟\n\n1️⃣ تغيير التاريخ والوقت\n\n2️⃣ تغيير الوقت فقط\n\n\n\n0️⃣0️⃣ رجوع خطوة للخلف\n9️⃣9️⃣ إلغاء والعودة للقائمة"
        : lang === "hebrew"
        ? "מה תרצה לשנות?\n\n1️⃣ שינוי תאריך ושעה\n\n2️⃣ שינוי שעה בלבד\n\n\n\n0️⃣0️⃣ חזרה צעד אחד\n9️⃣9️⃣ ביטול וחזרה לתפריט"
        : "What would you like to change?\n\n1️⃣ Change date & time\n\n2️⃣ Change time only\n\n\n\n0️⃣0️⃣ Go back\n9️⃣9️⃣ Cancel & back to menu",
  });
  

};
