// utils/sendDatePickerTemplate.js
const { sendTemplate } = require("./sendTwilio");

async function sendDatePickerTemplate(biz, to, days, lang) {
  const sid = biz?.wa?.templates?.booking?.askDateSid;
  if (!sid) return false;

  const vars = {};

  days.forEach((d, idx) => {
    const n = idx + 1;

    vars[`row${n}_name`] = d;   // visible text
    vars[`row${n}_id`]   = `${n}`; // the row ID (1–10)
    vars[`row${n}_desc`] = "";  // required by template, but empty
  });

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