const { sendTemplate } = require("./sendTwilio");
const { buildLanguageTemplate } = require("./buildLanguageTemplate");

async function sendLanguageTemplate(biz, to, lang = "english") {
  if (!biz?.wa?.templates?.languageSelectSid) return false;

  const variables = buildLanguageTemplate(lang);

  await sendTemplate({
    from: biz.wa.number,
    to,
    contentSid: biz.wa.templates.languageSelectSid,
    variables,
    messagingServiceSid: biz?.wa?.messagingServiceSid || undefined,
  });

  return true;
}

module.exports = { sendLanguageTemplate };


/**
 * Fallback if template fails: send plain WhatsApp text
 */
// async function sendLanguageFallback(biz, to, lang = "english") {
//   const bodyHeader = `💬 ${t(lang, "choose_language")}`;
//   const buttons = [
//     { id: LANG_AR, label: t(lang, "arabic") },
//     { id: LANG_EN, label: t(lang, "english") },
//     { id: LANG_HE, label: t(lang, "hebrew") },
//   ];
//   const body = bodyHeader + "\n" + buttons.map((b, i) => `${i + 1}) ${b.label}`).join("\n");
//   await sendWhatsApp({ from: biz.wa.number, to, body });
// }

module.exports = { sendLanguageTemplate, sendLanguageFallback };
