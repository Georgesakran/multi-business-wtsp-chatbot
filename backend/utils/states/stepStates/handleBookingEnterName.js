const { sendWhatsApp } = require("../../twilio/sendTwilio");
const Customer = require("../../../models/Customer");

/**
 * Handle the step where the user enters their full name
 * - If customer exists and has a name, ask if they want to keep/change it
 * - If customer has no name, ask for full name
 */
module.exports = async function handleBookingEnterName({
  biz,
  from,
  lang,
  txt,
  state,
  setState,
}) {
  const input = txt?.trim();

  // Load customer by phone
  const customer = await Customer.findOne({ businessId: biz._id, phone: from });

  // If customer exists and has a name stored
  if (customer?.name) {
    if (!state.data?.awaitingNameConfirmation) {
      // Ask if they want to keep or change the name
      const msg =
        lang === "arabic"
          ? `اسمك الحالي هو: *${customer.name}*\nهل تريد تغييره؟ إذا أردت الاحتفاظ به اكتب *0*، وإذا أردت تغييره اكتب الاسم الكامل الجديد.`
          : lang === "hebrew"
          ? `השם שלך כרגע הוא: *${customer.name}*\nרוצה לשנות אותו? כדי לשמור את השם הקיים כתוב *0*, כדי לשנות כתוב שם מלא חדש.`
          : `Your current name is: *${customer.name}*\nDo you want to change it? Type *0* to keep it, or enter a new full name to update.`;

      // Set state to wait for confirmation/input
      await setState(state, {
        step: "BOOKING_ENTER_NAME",
        data: { ...state.data, awaitingNameConfirmation: true },
      });

      await sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: msg,
      });
      return;
    } else {
      // Handle response to confirmation
      if (input === "0") {
        // Keep existing name
        await setState(state, {
          step: "BOOKING_ENTER_NOTE",
          data: { ...state.data, customerName: customer.name },
        });
      } else if (input.length < 2) {
        // Invalid name entered
        const msg =
          lang === "arabic"
            ? "من فضلك اكتب اسمًا واضحًا (على الأقل حرفين)."
            : lang === "hebrew"
            ? "נא לכתוב שם ברור (לפחות שני תווים)."
            : "Please send a clear name (at least 2 characters).";

        await sendWhatsApp({ from: biz.wa.number, to: from, body: msg });
        return;
      } else {
        // Update with new name
        await setState(state, {
          step: "BOOKING_ENTER_NOTE",
          data: { ...state.data, customerName: input },
        });
      }
    }
  } else {
    // No name stored → normal flow
    if (!input || input.length < 2) {
      const body =
        lang === "arabic"
          ? "من فضلك اكتب/ي اسمًا واضحًا (على الأقل حرفين)."
          : lang === "hebrew"
          ? "נא לכתוב שם ברור (לפחות שני תווים)."
          : "Please send a clear name (at least 2 characters).";

      await sendWhatsApp({ from: biz.wa.number, to: from, body });
      return;
    }

    // Store the name → move to next step
    await setState(state, {
      step: "BOOKING_ENTER_NOTE",
      data: { ...state.data, customerName: input },
    });
  }

  // Ask for notes after storing name
  const msg =
    lang === "arabic"
      ? "5️⃣ هل لديك ملاحظات خاصة !! (مثال: لون/شكل/معلومة إضافية)؟\nاكتب/ي ما تريدين، أو اكتب/ي *0* إذا لا توجد ملاحظات."
      : lang === "hebrew"
      ? "5️⃣ יש לך הערות מיוחדות (צבע, צורה, בקשה נוספת)?\nכתב/י מה שצריך, או כתב/י *0* אם אין הערות."
      : "5️⃣ Any special notes (e.g. style, color, anything extra)?\nWrite your note, or send *0* if you have no notes.";

  await sendWhatsApp({ from: biz.wa.number, to: from, body: msg });
};
