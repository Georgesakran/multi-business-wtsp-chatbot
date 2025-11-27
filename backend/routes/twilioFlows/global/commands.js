// utils/flows/global/help.js
const sendWhatsApp = require("../../../utils/twilio/sendTwilio");
const {sendLanguageTemplate , sendLanguageFallback} = require("../../../utils/twilio/sendLanguageHelpers");
const { t } = require("../../../utils/language/languageTextHelper");
const { langFromCustomer } = require("../../../utils/language/languageTextHelper");
const setState = require("../../../utils/states/setState");
const { buildMenuText } = require("../../../utils/menuControllers/menuUtils/menuBuilder");


// HELP COMMAND
module.exports = async function handleHelp({ biz, from, customer }) {
  const lang = langFromCustomer(customer, biz);
  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body: t(lang, "help"),
  });
};


// RESTART COMMAND
module.exports = async function handleRestart({ biz, from, state }) {
    await setState(state, { step: "LANGUAGE_SELECT", data: {} });
    const sent = await sendLanguageTemplate(biz, from);
    if (!sent) await sendLanguageFallback(biz, from);
};


// CANCEL COMMAND
module.exports = async function handleCancel({ biz, from, state, customer }) {
    const lang = langFromCustomer(customer, biz);
    await setState(state, { step: "MENU", data: {} });
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: t(lang, "cancelled"),
    });
};

// BACK COMMAND
module.exports = async function handleBack({ biz, from, state, customer }) {
  const lang = langFromCustomer(customer, biz);
  await setState(state, { step: "default", data: {} });
  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body: t(lang, "backed"),
  });
};


// MENU COMMAND
module.exports = async function showMenu({ biz, from, lang, langKey, state }) {
  const menuText = buildMenuText(biz, langKey, lang);
  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body: menuText,
  });
  await setState(state, { step: "MENU" });
};