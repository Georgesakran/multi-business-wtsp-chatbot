const { LANG_AR, LANG_EN, LANG_HE } = require("../constants/systemConstants");
const { t } = require("../language/languageTextHelper");

function buildLanguageTemplate(lang = "english") {
  const body = t(lang, "choose_language");

  const buttons = [
    { type: "quick_reply", text: t(lang, "arabic"), id: LANG_AR },
    { type: "quick_reply", text: t(lang, "english"), id: LANG_EN },
    { type: "quick_reply", text: t(lang, "hebrew"), id: LANG_HE },
  ];

  return {
    type: "interactive",
    interactive: { type: "button", body: { text: body }, action: { buttons } },
  };
}

module.exports = { buildLanguageTemplate };
