// utils/states/stepStates/handleBookingSelectTime.js
const { sendWhatsApp } = require("../../twilio/sendTwilio");
const parseMenuIndexFromText = require("../../menuControllers/menuUtils/menuParser");
const Customer = require("../../../models/Customer");
const Booking = require("../../../models/Booking");
const chooseChangeType = require("../../menuControllers/reschedule/chooseChangeType");

/**
 * Handle user selecting a time slot in booking
 */
module.exports = async function handleBookingSelectTime({
  biz,
  from,
  lang,
  langKey,
  txt,
  state,
  setState,
}) {

  function buildMenuData(data = {}) {
    return {
      language: data.language,
      langKey: data.langKey,
      customerName: data.customerName,
    };
  }
    // command 00
  if (txt === "00") {
    console.log("Going back to change type");
    await setState(state, {
      step: state.data.backStep || "RESCHEDULE_CHOOSE_CHANGE_TYPE",
      // keep the existing data so chooseChangeType has what it needs
      data: { ...state.data },
    });
    return chooseChangeType({ biz, from, txt:"" ,lang, langKey, state }); 
  }

  
    // command 99
    if (txt === "99") {
      await setState(state, {
        step: state.data.backStep || "MENU",
        replaceData: true,
        data: buildMenuData(state.data),
      });
      return showMenu({ biz, from, lang, langKey, state });
    }


  const slots = state.data?.slots || [];
  const idx = parseMenuIndexFromText(txt);

  // INVALID INDEX → Show list again
  if (idx == null || idx < 0 || idx >= slots.length) {
    const lines = slots.map((t, i) => `${i + 1}) ${t}`);

    const body =
      lang === "arabic"
        ? `من فضلك اختار/ي رقمًا من الأوقات:\n\n${lines.join(
            "\n"
          )}\n\nأو اكتب/ي *menu* للعودة.`
        : lang === "hebrew"
        ? `בחר/י מספר מתוך השעות הבאות:\n\n${lines.join(
            "\n"
          )}\n\nאו כתב/י *menu* כדי לחזור.`
        : `Please choose a number from these times:\n\n${lines.join(
            "\n"
          )}\n\nOr type *menu* to go back.`;

    await sendWhatsApp({ from: biz.wa.number, to: from, body });
    return;
  }
  // VALID TIME
  const time = slots[idx];

// ---------------- RESCHEDULE FLOW ----------------
if (state.data?.reschedule) {
  await Booking.findByIdAndUpdate(state.data.selectedAppointment._id, {
    date: state.data.date,
    time,
  });

  // Fetch updated booking (for full details)
  const booking = await Booking.findById(
    state.data.selectedAppointment._id
  );

  const svcName =
    booking?.serviceSnapshot?.name?.[langKey] ||
    booking?.serviceSnapshot?.name?.en ||
    "";

  const msg =
        lang === "arabic"
          ? `✅ تم *تعديل موعدك بنجاح*!

    👤 الاسم: *${booking.customerName}*
    💅 الخدمة: *${svcName}*
    📅 التاريخ الجديد: *${booking.date}*
    ⏰ الساعة الجديدة: *${booking.time}*

    يمكنك دائماً كتابة *menu* للعودة للقائمة.`
          : lang === "hebrew"
          ? `✅ התור שלך *עודכן בהצלחה*!

    👤 שם: *${booking.customerName}*
    💅 שירות: *${svcName}*
    📅 תאריך חדש: *${booking.date}*
    ⏰ שעה חדשה: *${booking.time}*

    אפשר בכל רגע לכתוב *menu* כדי לחזור לתפריט.`
          : `✅ Your appointment has been *updated successfully*!

    👤 Name: *${booking.customerName}*
    💅 Service: *${svcName}*
    📅 New date: *${booking.date}*
    ⏰ New time: *${booking.time}*

    You can type *menu* anytime to go back.`;

  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body: msg,
  });

  function buildMenuData(data = {}) {
    return {
      language: data.language,
      langKey: data.langKey,
      customerName: data.customerName,
    };
  }

  // reset state to menu
  await setState(state, {
    step: "MENU",
    replaceData: true,
    data: buildMenuData(state.data),
  });

  return;
}


  // Fetch customer to check name
  let customer = await Customer.findOne({ businessId: biz._id, phone: from });
  const name = customer?.name || "";

  // CASE 1: no name yet
  if (!name) {
    await setState(state, {
      step: "BOOKING_ENTER_NAME",
      data: {
        ...state.data,
        time,
        langKey,
      },
    });

    const msg =
      lang === "arabic"
        ? `✅ تم اختيار الوقت: *${time}*\n\n4️⃣ نحتاج اسمك الكامل للحجز.`
        : lang === "hebrew"
        ? `✅ נבחרה שעה: *${time}*\n\n4️⃣ אנא הזן את שמך המלא להזמנה.`
        : `✅ Time selected: *${time}*\n\n4️⃣ We need your full name for the booking.`;

    await sendWhatsApp({ from: biz.wa.number, to: from, body: msg });
    return;
  }

  // CASE 2 & 3: name exists → wait for confirmation / update
  await setState(state, {
    step: "AWAITING_NAME_CONFIRM",
    data: {
      ...state.data,
      time,
      langKey,
      storedName: name, // save existing name
    },
  });

  const msg =
    lang === "arabic"
      ? `✅ تم اختيار الوقت: *${time}*\nاسمك الكامل المسجل: *${name}*\nاكتب 0 إذا كنت تريد الاحتفاظ بالاسم أو اكتب اسمك الكامل إذا أردت تغييره.`
      : lang === "hebrew"
      ? `✅ נבחרה שעה: *${time}*\nהשם המלא שלך: *${name}*\nהקלד 0 אם ברצונך לשמור על השם או הקלד שם מלא חדש כדי לשנות.`
      : `✅ Time selected: *${time}*\nYour full name: *${name}*\nType 0 to keep it, or type your full name to update.`;

  await sendWhatsApp({ from: biz.wa.number, to: from, body: msg });
};
