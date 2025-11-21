// services/messaging/templateService.js
const { sendTemplate } = require("./twilioService");

async function sendDatePickerTemplate(biz, to, days, lang) {
  const contentSid = biz?.wa?.templates?.datePickerSid;
  if (!contentSid) return false;

  const variables = {};

  days.forEach((dateStr, i) => {
    const n = i + 1;
    variables[`row${n}_name`] = dateStr;
    variables[`row${n}_id`] = dateStr;
    variables[`row${n}_desc`] = "";
  });

  return sendTemplate({
    from: biz.wa.number,
    to,
    contentSid,
    variables
  });
}

module.exports = { sendDatePickerTemplate };