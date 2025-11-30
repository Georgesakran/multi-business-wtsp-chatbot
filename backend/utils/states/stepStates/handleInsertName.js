// utils/flows/language/handleInsertName.js
const Customer = require("../../../models/Customer");
const setState = require("../setState");
const { sendWhatsApp } = require("../../twilio/sendTwilio");
const { buildMenuText } = require("../../menuControllers/menuUtils/menuBuilder");
const getConfigMessage = require("../../config/configMessageHelper");
const { t } = require("../../language/languageTextHelper");

/**
 * Handle customer entering name after language selection
 */
module.exports = async function handleInsertName({ biz, from, state, txt, lang, langKey }) {
  const name = txt?.trim();

  // Validate name
  if (!name || name.length < 2) {
    const msg =
      lang === "arabic"
        ? "من فضلك اكتب/ي اسمًا واضحًا (على الأقل حرفين)."
        : lang === "hebrew"
        ? "נא לכתוב שם ברור (לפחות שני תווים)."
        : "Please send a clear name (at least 2 characters).";

    await sendWhatsApp({ from: biz.wa.number, to: from, body: msg });
    return false; // indicate we didn't finish handling
  }

  // Save name
  await Customer.findOneAndUpdate(
    { businessId: biz._id, phone: from },
    { $set: { name: name } }
  );

  // Send welcome + menu
  const msgType = "welcome_first"; // after name, always first welcome
  const welcomeText = getConfigMessage(biz, langKey, msgType, t(lang, "welcome"));
  const menuText = buildMenuText(biz, langKey, lang);

  await sendWhatsApp({ from: biz.wa.number, to: from, body: welcomeText });
  await sendWhatsApp({ from: biz.wa.number, to: from, body: menuText });

  // Update state to MENU
  await setState(state, { step: "MENU", data: { language: lang } });

  return true; // indicate handling finished successfully
};
