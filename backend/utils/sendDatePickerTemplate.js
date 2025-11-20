const { sendTemplate } = require("./sendTwilio");

/**
 * Sends the 10-day date picker list using Twilio Content Template
 * @param {*} biz - business document
 * @param {*} to - customer number
 * @param {*} days - array of 10 dates ["2025-02-02", ...]
 * @param {*} lang - "arabic" | "english" | "hebrew"
 */
async function sendDatePickerTemplate(biz, to, days, lang) {
  const sid =
    biz?.wa?.templates?.booking?.askDateSid;
  // Row titles ONLY (we do not send IDs because template contains fixed row IDs)
  // Template rows must already exist inside Twilio template editor
  const vars = {};

  days.forEach((d, idx) => {
    vars[`row${idx + 1}`] = d;
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