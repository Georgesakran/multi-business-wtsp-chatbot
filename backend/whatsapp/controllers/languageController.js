// controllers/languageController.js
const { sendWhatsApp, sendTemplate } = require("../services/messaging/twilioService");
const customerService = require("../services/customerService");
const stateManager = require("../state/stateManager");
const { t, parseLanguageChoice } = require("../utils/i18n");
const menuService = require("../services/menuService");

module.exports = {
  // -------------------------------------------
  // Step 1: Ask user to pick a language
  // -------------------------------------------
  askForLanguage: async ({ biz, from }) => {
    const templateSid = biz?.wa?.templates?.languageSelectSid;

    if (templateSid) {
      await sendTemplate({
        from: biz.wa.number,
        to: from,
        contentSid: templateSid,
        variables: {},
      });
    } else {
      await sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: "💬 Please choose language:\n1) العربية\n2) English\n3) עברית",
      });
    }
  },

  // ---------------------------------------------------
  // Step 2: Process user selection (1/2/3 or text)
  // ---------------------------------------------------
  handleLanguageSelection: async ({ biz, from, text, state }) => {
    const choice = parseLanguageChoice(text);

    if (!choice) {
      // re-send language picker
      return module.exports.askForLanguage({ biz, from });
    }

    // update customer language
    const customer = await customerService.setLanguage(biz._id, from, choice);

    await stateManager.setState(state, {
      step: "MENU",
      data: { language: choice },
    });

    const langKey = customerService.langKey(choice);

    const welcomeMsg = t(choice, "welcome");
    const menuMsg = menuService.buildMenuText(biz, langKey, choice);

    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: welcomeMsg,
    });

    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: menuMsg,
    });
  },
};