const { sendTemplate } = require("./twilio/sendTwilio");

async function sendDatePickerTemplate(biz, to, days, lang) {
  const sid = biz?.wa?.templates?.booking?.askDateSid;

  const vars = {
    body:
      lang === "arabic"
        ? "📆 اختاري تاريخ الموعد:"
        : lang === "hebrew"
        ? "📆 בחרי תאריך:"
        : "📆 Choose an appointment date:",

    select_button:
      lang === "arabic"
        ? "اختيار التاريخ"
        : lang === "hebrew"
        ? "בחרי תאריך"
        : "Select date",
  };

  for (let i = 1; i <= 10; i++) {
    vars[`row${i}_name`] = days[i - 1] || "";
    vars[`row${i}_id`] = `DATE_${i}`;
    vars[`row${i}_desc`] = "";
  }

  await sendTemplate({
    from: biz.wa.number,
    to,
    contentSid: sid,
    variables: vars,
    messagingServiceSid: biz?.wa?.messagingServiceSid,
  });

  return true;
}

module.exports = sendDatePickerTemplate;