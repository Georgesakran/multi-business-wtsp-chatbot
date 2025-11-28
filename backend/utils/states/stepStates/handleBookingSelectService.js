// utils/states/stepStates/handleBookingSelectService.js

const moment = require("moment");
const parseMenuIndexFromText = require("../../menuControllers/menuUtils/menuParser");
const setState  = require("../setState");
const {findServiceById, checkFreeSlotsToday} = require("../../time/bookingHelpers");
const getNext10Days = require("../../getNext10Days");
const {sendWhatsApp} = require("../../twilio/sendTwilio");
const sendDatePickerTemplate = require("../../twilio/sendDatePickerTemplate");

module.exports = async function handleBookingSelectService({
  biz,
  from,
  txt,
  lang,
  langKey,
  state,
}) {
  try {
    // 1) Get service IDs the chatbot previously sent
    const serviceIds = state.data?.serviceIds || [];

    // 2) Convert user input (Arabic/Hebrew/English digits → index)
    const index = parseMenuIndexFromText(txt);

    console.log("📌 Incoming service selection:");
    console.log("serviceIds:", serviceIds);
    console.log("txt:", txt);
    console.log("index:", index);

    // 3) If invalid index → ask again
    if (index == null || index < 0 || index >= serviceIds.length) {
      await sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body:
          lang === "arabic"
            ? "من فضلك أرسلي رقم خدمة من القائمة، أو اكتبي *menu* للعودة."
            : lang === "hebrew"
            ? "בחרי מספר שירות מהרשימה, או כתבי *menu* כדי לחזור."
            : "Please send a service number from the list, or type *menu* to go back.",
      });
      return;
    }

    // 4) Get selected service data
    const selectedServiceId = serviceIds[index];
    const svc = findServiceById(biz, selectedServiceId);

    if (!svc) {
      await sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body:
          lang === "arabic"
            ? "هذا الخدمة لم تعد متاحة. اكتبي *menu* لبدء من جديد."
            : lang === "hebrew"
            ? "השירות הזה כבר לא זמין. כתבי *menu* כדי להתחיל מחדש."
            : "This service is no longer available. Type *menu* to start again.",
      });
      return;
    }

    // 5) Prepare service snapshot for booking
    const key = langKey; // 'ar' | 'en' | 'he'
    const serviceSnapshot = {
      name: {
        en: svc.name?.en || "",
        ar: svc.name?.ar || "",
        he: svc.name?.he || "",
      },
      price: Number(svc.price || 0),
      duration: Number(svc.duration || 0),
    };

    // 6) Prepare next 10 days
    const rawDays = getNext10Days(biz);
    let days = [...rawDays];

    const todayStr = moment().format("YYYY-MM-DD");
    if (days.includes(todayStr)) {
      const hasFree = await checkFreeSlotsToday(biz);
      if (!hasFree) {
        days = days.filter((d) => d !== todayStr);
      }
    }

    // 7) Save next state
    await setState(state, {
      step: "BOOKING_SELECT_DATE_LIST",
      data: {
        serviceId: selectedServiceId,
        serviceSnapshot,
        days,
      },
    });

    // 8) Send Twilio interactive template for date selection
    await sendDatePickerTemplate(biz, from, days, lang);
  } catch (err) {
    console.error("❌ Error in handleBookingSelectService:", err);

    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body:
        lang === "arabic"
          ? "حدث خطأ غير متوقع. يرجى كتابة *menu* للبدء من جديد."
          : lang === "hebrew"
          ? "אירעה שגיאה. כתבי *menu* כדי להתחיל מחדש."
          : "Unexpected error. Please type *menu* to start again.",
    });
  }
};
