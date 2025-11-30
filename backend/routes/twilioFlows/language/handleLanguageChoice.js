// utils/flows/language/handleLanguageChoice.js
const Customer = require("../../../models/Customer");
const setState = require("../../../utils/states/setState");
const { parseLanguageChoice } = require("../../../utils/language/languageParser");
const { buildMenuText } = require("../../../utils/menuControllers/menuUtils/menuBuilder");
const getConfigMessage = require("../../../utils/config/configMessageHelper");
const { langKeyFromChoice, t } = require("../../../utils/language/languageTextHelper");
const { sendWhatsApp } = require("../../../utils/twilio/sendTwilio");
const { sendLanguageTemplate, sendLanguageFallback } = require("../../../utils/twilio/sendLanguageHelpers");

async function handleLanguageChoice({ biz, from, state, customer, txt }) {
  const choice = parseLanguageChoice(txt);

  // Invalid input → ask again
  if (!choice) {
    const sent = await sendLanguageTemplate(biz, from);
    if (!sent) await sendLanguageFallback(biz, from);
    return;
  }

  const wasFirstTime = !customer;

  // Update or create customer
  customer = await Customer.findOneAndUpdate(
    { businessId: biz._id, phone: from },
    {
      $setOnInsert: { businessId: biz._id, phone: from },
      $set: { language: choice, "stats.lastSeenAt": new Date() },
    },
    { new: true, upsert: true }
  );

  const langKey = langKeyFromChoice(choice);

  // If we don’t have the customer name → ask for it first
  if (!customer.customerName || customer.customerName.trim().length < 2) {
    // Save temporary state to know next message is name
    await setState(state, { step: "AWAITING_NAME", data: { language: choice } });

    const askNameMsg =
      choice === "arabic"
        ? "مرحباً! من فضلك أرسل اسمك الكامل."
        : choice === "hebrew"
        ? "שלום! נא לשלוח את שמך המלא."
        : "Hello! Please send your full name.";

    await sendWhatsApp({ from: biz.wa.number, to: from, body: askNameMsg });
    return;
  }

  // Customer already has a name → send welcome + menu
  await setState(state, { step: "MENU", data: { language: choice } });

  const msgType = wasFirstTime ? "welcome_first" : "welcome_returning";
  const welcomeText = getConfigMessage(biz, langKey, msgType, t(choice, "welcome"));
  const menuText = buildMenuText(biz, langKey, choice);

  await sendWhatsApp({ from: biz.wa.number, to: from, body: welcomeText });
  await sendWhatsApp({ from: biz.wa.number, to: from, body: menuText });
}

module.exports = handleLanguageChoice;
