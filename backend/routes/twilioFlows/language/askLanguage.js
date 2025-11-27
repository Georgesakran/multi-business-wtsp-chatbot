// routes/twilioFlows/language/askLanguage.js
const setState = require("../../../utils/states/setState");
const {
  sendLanguageTemplate,
  sendLanguageFallback,
} = require("../../twilio/sendLanguageHelpers");

module.exports = async function askLanguage({ biz, from, state }) {
  // move to LANGUAGE_SELECT state
  await setState(state, { step: "LANGUAGE_SELECT" });

  const sent = await sendLanguageTemplate(biz, from);
  if (!sent) await sendLanguageFallback(biz, from);
};