const { sendTemplate, sendWhatsApp } = require("./sendTwilio");
const { buildLanguageTemplate } = require("./buildLanguageTemplate");
const { LANG_AR, LANG_EN, LANG_HE } = require("../constants/systemConstants");
const { t } = require("../language/languageTextHelper");

/**
 * Send interactive template for language selection
 */
async function sendLanguageTemplate(biz, to, lang = "english") {
  if (!biz?.wa?.templates?.languageSelectSid) return false;

  const template = buildLanguageTemplate(lang);

  await sendTemplate({
    from: biz.wa.number,
    to,
    contentSid: biz.wa.templates.languageSelectSid,
    variables: template,
    messagingServiceSid: biz?.wa?.messagingServiceSid || undefined,
  });

  return true;
}

/**
 * Fallback if template fails: send plain WhatsApp text
 */
async function sendLanguageFallback(biz, to, lang = "english") {
  const bodyHeader = `💬 ${t(lang, "choose_language")}`;
  const buttons = [
    { id: LANG_AR, label: t(lang, "arabic") },
    { id: LANG_EN, label: t(lang, "english") },
    { id: LANG_HE, label: t(lang, "hebrew") },
  ];
  const body = bodyHeader + "\n" + buttons.map((b, i) => `${i + 1}) ${b.label}`).join("\n");
  await sendWhatsApp({ from: biz.wa.number, to, body });
}

module.exports = { sendLanguageTemplate, sendLanguageFallback };
