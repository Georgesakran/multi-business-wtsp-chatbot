const { sendWhatsApp } = require("../../twilio/sendTwilio");
const setState = require("../../../utils/states/setState");

module.exports = async function selectAppointment({
  biz,
  from,
  txt,
  state,
  lang,
  langKey,
}) {
  if (txt === "0") {
    await setState(state, { step: "MENU", data: {} });
    return;
  }

  const idx = parseInt(txt, 10) - 1;
  const appointments = state.data?.appointments || [];

  function buildRescheduleState(data, selectedAppointment) {
    return {
      language: data.language,
      langKey: data.langKey,
      storedName: data.storedName,
      customerName: data.customerName,
      selectedAppointment,
    };
  }
  

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
    data: buildRescheduleState(state.data, appointments[idx]),
    replaceData: true,
  });
  

  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body:
      lang === "arabic"
        ? "ماذا تريد التغيير؟\n\n1️⃣ تغيير التاريخ\n2️⃣ تغيير الوقت\n0️⃣ رجوع"
        : lang === "hebrew"
        ? "מה תרצה לשנות?\n\n1️⃣ שינוי תאריך\n2️⃣ שינוי שעה\n0️⃣ חזרה"
        : "What would you like to change?\n\n1️⃣ Change date\n2️⃣ Change time\n0️⃣ Back",
  });
};
