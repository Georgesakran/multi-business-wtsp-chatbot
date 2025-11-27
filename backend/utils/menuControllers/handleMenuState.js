// utils/menuControllers/handleMenuStep.js
const sendWhatsApp = require("../twilio/sendTwilio");
const parseMenuIndexFromText = require("./menuUtils/menuParser");
const getVisibleMenuItemsSorted = require("./menuUtils/menuUtils");
const handleMenuAction = require("./handleMenuAction");

async function handleMenuStep({ biz, from, txt, lang, langKey, state }) {
  const structuredItems = getVisibleMenuItemsSorted(biz);

  // If we have menu items
  if (structuredItems.length) {
    const index = parseMenuIndexFromText(txt);

    // Invalid index → send message again
    if (index == null || index < 0 || index >= structuredItems.length) {
      await sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body:
          lang === "arabic"
            ? "من فضلك اختر رقمًا من القائمة أو أرسل *menu* لعرضها مرة أخرى."
            : lang === "hebrew"
            ? "בחר/י מספר מהתפריט או שלח/י *menu* להצגה מחדש."
            : "Please choose a number from the menu, or send *menu* again.",
      });
      return { handled: true };
    }

    // Valid selection
    const item = structuredItems[index];
    const action = item.action || "custom";
    const payload = item.payload || "";

    await handleMenuAction({
      action,
      payload,
      lang,
      langKey,
      biz,
      state,
      from,
    });

    return { handled: true };
  }

  // No menu items defined
  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body:
      lang === "arabic"
        ? "القائمة غير مهيّأة بعد. أرسلي *menu* لاحقًا أو اكتبي سؤالك بحرية."
        : lang === "hebrew"
        ? "התפריט עדיין לא הוגדר. שלחי *menu* שוב מאוחר יותר או כתבי לנו חופשי."
        : "The menu is not configured yet. Try *menu* later or just ask your question.",
  });

  return { handled: true };
};

module.exports = handleMenuStep;