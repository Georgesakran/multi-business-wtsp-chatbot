const { LANG_AR, LANG_EN, LANG_HE } = require("../constants/systemConstants");
const { t } = require("../language/languageTextHelper");

function buildLanguageTemplate(lang = "english") {
  return {
    body: t(lang, "choose_language"),

    btn1_text: t(lang, "arabic"),
    btn2_text: t(lang, "english"),
    btn3_text: t(lang, "hebrew"),

    LANG_AR,
    LANG_EN,
    LANG_HE,
  };
}

module.exports = { buildLanguageTemplate };
