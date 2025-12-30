// utils/states/stepStates/handleBookingEnterNote.js

const Booking = require("../../../models/Booking");
const makeDayGrid = require("../../time/gridHelpers");
const { slotsNeeded, getTakenMap, isRangeFree, weekdayFromISO } = require("../../time/bookingHelpers");
const { sendWhatsApp } = require("../../twilio/sendTwilio");
const Customer = require("../../../models/Customer");


/**
 * Handle the step where the user enters a note (or skips)
 */
async function handleBookingEnterNote({ txt, state, biz, from, lang, setState }) {
  // ---- process notes ----
  let notes = txt?.trim() || "";
  if (notes === "0" || notes.toLowerCase() === "skip") notes = "";

  const { serviceId, serviceSnapshot, date, time, langKey } = state.data || {};
  const key = langKey || 'en'; // fallback to English

  let customer = await Customer.findOne({ businessId: biz._id, phone: from });
  const customerName = customer?.name || "";

  function buildMenuData(data = {}) {
    return {
      language: data.language,
      langKey: data.langKey,
      storedName: data.storedName,
      customerName: data.customerName,
    };
  }

  if (!serviceId || !date || !time || !customerName) {
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body:
        lang === "arabic"
          ? "حدث خطأ في الحجز. اكتب/ي *menu* للبدء من جديد."
          : lang === "hebrew"
          ? "אירעה שגיאה בתהליך ההזמנה. כתב/י *menu* כדי להתחיל מחדש."
          : "Something went wrong with the booking flow. Please type *menu* to start again.",
    });
    await setState(state, {
      step: "MENU",
      replaceData: true,
      data: buildMenuData(state.data),
    });
    return;
  }

  try {
    const bookingCfg = biz.config?.booking || {};
    const workingDays = Array.isArray(bookingCfg.workingDays) ? bookingCfg.workingDays : [];
    const weekday = weekdayFromISO(date);

    if ((biz.closedDates || []).includes(date)) throw new Error("Business closed on that date");
    if (!workingDays.includes(weekday)) throw new Error("Selected date is not a working day");

    const openingTime = bookingCfg.openingTime || "09:00";
    const closingTime = bookingCfg.closingTime || "18:00";
    const gap = Number(bookingCfg.slotGapMinutes || 15);
    const grid = makeDayGrid(openingTime, closingTime, gap);
    const idx = grid.indexOf(time);
    if (idx === -1) throw new Error("Time is outside working hours");

    let need = 1;
    if (serviceSnapshot?.duration) need = slotsNeeded(serviceSnapshot.duration, gap);

    const taken = await getTakenMap(biz._id, date);
    if (!isRangeFree(grid, taken, idx, need)) throw new Error("Slot already taken");

    const defaultStatus =
      biz?.config?.booking?.chatbotDefaultStatus === "confirmed" ? "confirmed" : "pending";

    // create booking
    const booking = await Booking.create({
      businessId: biz._id,
      customerName,
      phoneNumber: from,
      serviceId,
      serviceSnapshot,
      date,
      time,
      status: defaultStatus,
      source: "chatbot",
      notes,
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
      replaceData: true, // 🔥 THIS IS THE KEY
      data: buildMenuData(state.data),
    });
    
    

    const svcName = serviceSnapshot?.name?.[key] || serviceSnapshot?.name?.en || "";
    const isAutoConfirmed = defaultStatus === "confirmed";

    const msg =
      lang === "arabic"
        ? isAutoConfirmed
          ? `✅ تم إنشاء حجزك *وتأكيده* بنجاح!\n\n👤 الاسم: *${booking.customerName}*\n💅 الخدمة: *${svcName}*\n📅 التاريخ: *${booking.date}*\n⏰ الساعة: *${booking.time}*\n\nيمكنك دائماً كتابة *menu* للعودة للقائمة.`
          : `✅ تم إنشاء حجزك بنجاح!\n\n👤 الاسم: *${booking.customerName}*\n💅 الخدمة: *${svcName}*\n📅 التاريخ: *${booking.date}*\n⏰ الساعة: *${booking.time}*\n\nسيتم تأكيد الموعد قريباً. يمكنك دائماً كتابة *menu* للعودة للقائمة.`
        : lang === "hebrew"
        ? isAutoConfirmed
          ? `✅ ההזמנה שלך נוצרה ו*אושרה* בהצלחה!\n\n👤 שם: *${booking.customerName}*\n💅 שירות: *${svcName}*\n📅 תאריך: *${booking.date}*\n⏰ שעה: *${booking.time}*\n\nאפשר בכל רגע לכתוב *menu* כדי לחזור לתפריט.`
          : `✅ ההזמנה שלך נוצרה בהצלחה!\n\n👤 שם: *${booking.customerName}*\n💅 שירות: *${svcName}*\n📅 תאריך: *${booking.date}*\n⏰ שעה: *${booking.time}*\n\nהאישור הסופי יגיע בהמשך. אפשר בכל רגע לכתוב *menu* כדי לחזור לתפריט.`
        : isAutoConfirmed
        ? `✅ Your booking has been *created and confirmed*!\n\n👤 Name: *${booking.customerName}*\n💅 Service: *${svcName}*\n📅 Date: *${booking.date}*\n⏰ Time: *${booking.time}*\n\nYou can type *menu* anytime to go back.`
        : `✅ Your booking has been created!\n\n👤 Name: *${booking.customerName}*\n💅 Service: *${svcName}*\n📅 Date: *${booking.date}*\n⏰ Time: *${booking.time}*\n\nThe appointment will be confirmed shortly. You can type *menu* anytime to go back.`;

    await sendWhatsApp({ from: biz.wa.number, to: from, body: msg });
  } catch (err) {
    console.error("Booking via WhatsApp error:", err);
    const msg =
      lang === "arabic"
        ? "❌ لم نتمكن من تأكيد هذا الموعد (ربما الحجز ممتلئ أو التوقيت غير متاح). اكتبي *menu* وحاول/ي من جديد."
        : lang === "hebrew"
        ? "❌ לא הצלחנו לאשר את התור (אולי השעה נתפסה בינתיים). כתבי *menu* ונסי שוב."
        : "❌ We couldn’t confirm this booking (maybe the time was just taken). Please type *menu* and try again.";

    await sendWhatsApp({ from: biz.wa.number, to: from, body: msg });
    await setState(state, { step: "MENU", data: {} });
  }
}

module.exports = handleBookingEnterNote;
