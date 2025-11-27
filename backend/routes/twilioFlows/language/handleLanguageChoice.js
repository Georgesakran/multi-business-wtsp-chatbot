// utils/flows/language/handleLanguageChoice.js
const Customer = require("../../../models/Customer");
const setState = require("../../../utils/states/setState");
const { parseLanguageChoice } = require("../../../utils/language/languageParser");
const { buildMenuText } = require("../../../utils/menuControllers/menuUtils/menuBuilder");
const getConfigMessage = require("../../../utils/config/configMessageHelper");
const {
  langKeyFromChoice,
  t,
} = require("../../../utils/language/languageTextHelper");
const {sendWhatsApp, sendLanguageTemplate} = require("../../../utils/twilio/sendTwilio");

async function handleLanguageChoice({ biz, from, state, customer, txt }) {
  const choice = parseLanguageChoice(txt);

  // invalid input → ask again
  if (!choice) {
    const sent = await sendLanguageTemplate(biz, from);
    if (!sent) await sendLanguageFallback(biz, from);
    return;
  }

  const wasFirstTime = !customer;

  // Update customer
  customer = await Customer.findOneAndUpdate(
    { businessId: biz._id, phone: from },
    {
      $setOnInsert: { businessId: biz._id, phone: from },
      $set: { language: choice, "stats.lastSeenAt": new Date() },
    },
    { new: true, upsert: true }
  );

  await setState(state, { step: "MENU", data: { language: choice } });

  const langKey = langKeyFromChoice(choice);
  const msgType = wasFirstTime ? "welcome_first" : "welcome_returning";
  const welcomeText = getConfigMessage(
    biz,
    langKey,
    msgType,
    t(choice, "welcome")
  );

  const menuText = buildMenuText(biz, langKey, choice);

  // send welcome
  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body: welcomeText,
  });

  // send menu
  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body: menuText,
  });
};

module.exports = handleLanguageChoice;