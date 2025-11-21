// controllers/languageController.js

const { sendWhatsApp, sendTemplate } = require("../services/messaging/twilioService");
const customerService = require("../services/customerService");
const stateManager = require("../state/stateManager");
const { t, parseLanguageChoice } = require("../utils/i18n");
const menuService = require("../services/menuService");

// Words that trigger language switching directly
const switchTriggers = {
  arabic: ["ar", "arabic", "عربي", "عربية"],
  hebrew: ["he", "hebrew", "עברית"],
  english: ["en", "english"],
};

module.exports = {
  // -------------------------------------------
  // OLD LOGIC (KEEP THIS)
  // -------------------------------------------

  askForLanguage: async ({ biz, from }) => {
    const templateSid = biz?.wa?.templates?.languageSelectSid;

    if (templateSid) {
      return sendTemplate({
        from: biz.wa.number,
        to: from,
        contentSid: templateSid,
        variables: {},
      });
    }

    return sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: "💬 Please choose language:\n1) العربية\n2) English\n3) עברית",
    });
  },

  handleLanguageSelection: async ({ biz, from, text, state }) => {
    const choice = parseLanguageChoice(text);

    if (!choice) {
      return module.exports.askForLanguage({ biz, from });
    }

    // Update customer language
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

  // -------------------------------------------
  // NEW ARCHITECTURE REQUIREMENTS
  // -------------------------------------------

  /**
   * ✔️ Detect if the message is a language-switching command
   * (This is NEW and required by chatbotEntryController)
   */
  isLanguageSwitch(text) {
    if (!text) return false;
    const lower = text.toLowerCase();

    return (
      switchTriggers.arabic.includes(lower) ||
      switchTriggers.hebrew.includes(lower) ||
      switchTriggers.english.includes(lower)
    );
  },

  /**
   * ✔️ New-style language setter to satisfy chatbotEntryController
   * This wraps the old handleLanguageSelection logic.
   */
  async setLanguage({ biz, from, to, body, state }) {
    const lower = body.toLowerCase();
    let lang = "english";

    if (switchTriggers.arabic.includes(lower)) lang = "arabic";
    else if (switchTriggers.hebrew.includes(lower)) lang = "hebrew";

    // Update DB
    await customerService.setLanguage(biz._id, from, lang);

    // Update state (keep existing data)
    await stateManager.setState(state, {
      ...state.data,
      language: lang,
    });

    // Response texts
    const msg =
      lang === "arabic"
        ? "✔️ تم تغيير اللغة إلى العربية."
        : lang === "hebrew"
        ? "✔️ השפה הוגדרה לעברית."
        : "✔️ Language changed to English.";

    await sendWhatsApp({
      from: to,
      to: from,
      body: msg,
    });

    // Optional: immediately show main menu after switching language
    const langKey = customerService.langKey(lang);
    const menuText = menuService.buildMenuText(biz, langKey, lang);

    await sendWhatsApp({
      from: to,
      to: from,
      body: menuText,
    });
  },
};