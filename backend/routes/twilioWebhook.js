const express = require("express");
const router = express.Router();
const moment = require("moment");

// Models
const Business = require("../models/Business");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const Course = require("../models/Course");
const Booking = require("../models/Booking");

// Helpers
const getState = require("../utils/states/getState");
const setState = require("../utils/states/setState");

const getNext10Days = require("../utils/getNext10Days");

// Misc helpers
const { toE164 } = require("../utils/misc/phoneHelpers");
// language helpers
const { getLocalized } = require("../utils/language/localization");
const {t, langFromCustomer, langKeyFromCustomer, langKeyFromChoice} = require("../utils/language/languageTextHelper");
const PRODUCT_LABELS = require("../utils/language/labels/productLabels");
const COURSE_LABELS = require("../utils/language/labels/courseLabels");

// MENU Lang helpers
const parseMenuIndexFromText = require("../utils/menuControllers/menuUtils/menuParser");
const getConfigMessage= require("../utils/config/configMessageHelper");

// Time + Booking Helpers
const {
  checkFreeSlotsToday,
  slotsNeeded,
  findServiceById,
  getTakenMap,
  isRangeFree
} = require("../utils/time/bookingHelpers");
const makeDayGrid = require("../utils/time/gridHelpers");

// System Constants Helpers
const {BACK, CANCEL} = require("../utils/constants/systemConstants");

//Twilio
const sendDatePickerTemplate =require("../utils/twilio/sendDatePickerTemplate");
const {sendWhatsApp} = require("../utils/twilio/sendTwilio");

// Webhook Imports Helpers Functions
const { handleHelp, handleRestart ,handleCancel , showMenu} = require("./twilioFlows/global/commands");
const askLanguage = require("./twilioFlows/language/askLanguage");
const handleLanguageChoice = require("./twilioFlows/language/handleLanguageChoice");

const lower = (s) => String(s || "").toLowerCase();

// HANDLE STEPS 
const handleMenuStep = require("../utils/states/stepStates/handleMenuState");
const handleBookingSelectService = require("../utils/states/stepStates/handleBookingSelectService");
const handleBookingSelectDateList = require("../utils/states/stepStates/handleBookingSelectDateList");
const handleBookingSelectDate = require("../utils/states/stepStates/handleBookingSelectDate");
const handleBookingSelectTime = require("../utils/states/stepStates/handleBookingSelectTime");
const handleBookingEnterName = require("../utils/states/stepStates/handleBookingEnterName");
const handleBookingEnterNote = require("../utils/states/stepStates/handleBookingEnterNote");

// ---------- language parsing / mapping -----------
function productText(fieldObj, langKey) {
  return getLocalized(fieldObj, langKey);
}

// -------------------- webhook -----------------------------------------------
// -------------------- webhook -----------------------------------------------

router.post("/", async (req, res) => {
  try {
    // -------------------- constants & helpers --------------------
    const from = toE164(req.body?.From); // customer WA number
    const to = toE164(req.body?.To); // business WA number
    const rawText = (req) => (req.body?.Body || "").trim();
    const txt = rawText(req);
    const isCancelCmd = (txt) => txt === CANCEL || lower(txt) === "cancel";
    // const isBackCmd = (txt) => txt === BACK || lower(txt) === "back";
    const isRestartCmd = (txt) =>["restart", "/restart", "start"].includes(lower(txt));
    const isHelpCmd = (txt) => ["help", "?", "instructions","עזרה","مساعدة"].includes(lower(txt));
    const isMenuCmd = (txt) => ["menu",  "القائمة", "תפריט"].includes(lower(txt));

    const weekdayFromISO = (iso) =>
      new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" });
    // -------------------- load business --------------------
    const biz = await Business.findOne({ "wa.number": to, isActive: true });
    if (!biz) return res.sendStatus(200);

    // Load state + customer from DB
    let state = await getState({ businessId: biz._id, phoneNumber: from });
    let customer = await Customer.findOne({ businessId: biz._id, phone: from });
    const lang = langFromCustomer(customer, biz);
    const langKey = langKeyFromCustomer(customer, biz);

    // -------------------- LANGUAGE SELECTION FLOW --------------------
    if (!customer || !customer.language) {
      // Not yet selected → ask
      if (state.step !== "LANGUAGE_SELECT") {
        await askLanguage({ biz, from, state });
        return res.sendStatus(200);
      }
      // Already in LANGUAGE_SELECT → handle user choice
      await handleLanguageChoice({ biz, from, state, customer, txt });
      return res.sendStatus(200);
    }



    // -------------------- GLOBAL COMMANDS --------------------

    // HELP COMMAND
    if (isHelpCmd(txt)) {
      await handleHelp({ biz, from, customer });
      return res.sendStatus(200);
    }
    // RESTART COMMAND
    if (isRestartCmd(txt)) {
      await handleRestart({ biz, from, state });
      return res.sendStatus(200);
    }
    // CANCEL COMMAND
    if (isCancelCmd(txt)) {
      await handleCancel({ biz, from, state, customer });
      return res.sendStatus(200);
    }

    // BACK COMMAND
    // if (isBackCmd(txt)) {
    //   await handleBack({ biz, from, state, customer });
    //   return res.sendStatus(200);
    // }

    // MENU COMMAND
    if (isMenuCmd(txt)) {
      await showMenu({ biz, from, lang, langKey, state });
      return res.sendStatus(200);
    }

    // ------------------------- HANDLING STEPS -------------------
    // ---- MENU STEP ----
    if (state.step === "MENU") {
      await handleMenuStep({
        biz,
        from,
        txt,
        lang,
        langKey,
        state,
      });
    
      return res.sendStatus(200);
    }
    // ---- BOOKING: SELECT SERVICE ----
    if (state.step === "BOOKING_SELECT_SERVICE") {
      await handleBookingSelectService({
        biz,
        from,
        lang,
        langKey,
        txt,
        state,
      });
      return res.sendStatus(200);
    }
    // ---- BOOKING: SELECT DATE LIST ----
    if (state.step === "BOOKING_SELECT_DATE_LIST") {
      await handleBookingSelectDateList({
        biz,
        from,
        lang,
        langKey,
        txt,
        state,
      });
      return res.sendStatus(200);
    }
    // ---- BOOKING: SELECT DATE (show available slots) ----
    if (state.step === "BOOKING_SELECT_DATE") {
      await handleBookingSelectDate({
        biz,
        from,
        lang,
        langKey,
        txt,
        state,
      });
      return res.sendStatus(200);
    }
    // ---- BOOKING: SELECT TIME ----
    if (state.step === "BOOKING_SELECT_TIME") {
      await handleBookingSelectTime({
        biz,
        from,
        lang,
        txt,
        state,
        setState,
      });
      return res.sendStatus(200);
    }
    // ---- BOOKING: ENTER NAME ----
    if (state.step === "BOOKING_ENTER_NAME") {
      await handleBookingEnterName({
        biz,
        from,
        lang,
        txt,
        state,
        setState,
      });
      return res.sendStatus(200);
    }
    // ---- BOOKING: ENTER NOTE + CREATE BOOKING ----
    if (state.step === "BOOKING_ENTER_NOTE") {
      await handleBookingEnterNote({ txt, state, biz, from, lang, langKey, sendWhatsApp, setState, lower });
      return res.sendStatus(200);
    }





        // ---- PRODUCT DETAILS FLOW after "view_products" ----
    if (state.step === "VIEW_PRODUCTS_LIST") {
        const langKey = langKeyFromCustomer(customer, biz);
        const PL = PRODUCT_LABELS[lang] || PRODUCT_LABELS.english;
      
        const index = parseMenuIndexFromText(txt);
        const productIds = state.data?.productIds || [];
      
        // אם המשתמש כתב משהו שהוא לא מספר / מחוץ לטווח
        if (index == null || index < 0 || index >= productIds.length) {
          await sendWhatsApp({
            from: biz.wa.number,
            to: from,
            body:
              lang === "arabic"
                ? "من فضلك أرسلي رقم المنتج من القائمة، أو اكتبي *menu* للعودة للقائمة الرئيسية."
                : lang === "hebrew"
                ? "שלחי מספר מוצר מהרשימה, או כתבי *menu* כדי לחזור לתפריט הראשי."
                : "Please send a product number from the list, or type *menu* to go back to the main menu.",
          });
          return res.sendStatus(200);
        }
      
        const productId = productIds[index];
        const product = await Product.findOne({
          _id: productId,
          businessId: biz._id,
        });
      
        if (!product) {
          await sendWhatsApp({
            from: biz.wa.number,
            to: from,
            body:
              lang === "arabic"
                ? "هذا المنتج لم يعد متاحاً. جربي منتجاً آخر أو اكتبي *menu*."
                : lang === "hebrew"
                ? "המוצר הזה כבר לא זמין. נסי מוצר אחר או כתבי *menu*."
                : "This product is no longer available. Try another one or type *menu*.",
          });
          return res.sendStatus(200);
        }
      
        const name = productText(product.name, langKey);
        const descFull = productText(product.description, langKey);
        const category = productText(product.category, langKey);
        const price = product.price ? `${product.price}₪` : "";
        const sku = product.sku || "-";
        const stock = typeof product.stock === "number" ? product.stock : null;
      
        const owner = biz.owner || {};
        const phone = owner.phone || biz.whatsappNumber || biz.wa?.number || "";
      
        // 1️⃣ אם יש תמונה – שולחים קודם את התמונה (עם כותרת קצרה)
        const imgUrl = product.image?.secure_url || product.image?.url;
        console.log("PRODUCT IMAGE URL:", imgUrl, product.image);
       
        if (imgUrl) {
          await sendWhatsApp({
            from: biz.wa.number,
            to: from,
            body: `🛍️ ${name || ""}`,
            mediaUrl: imgUrl, // sendTwilio כבר יודע לטפל בזה
          });
        }
      
        // // 2️⃣ ואז שולחים את פרטי המוצר
        // const stockLine =
        //   stock != null ? `\n📦 ${PL.stock}: ${stock}` : "";
      
        const phoneLine = phone
          ? lang === "arabic"
            ? `- الاتصال على: ${phone}`
            : lang === "hebrew"
            ? `- להתקשר אלינו: ${phone}`
            : `- Call us at: ${phone}`
          : lang === "arabic"
          ? "- رقم الهاتف غير مضاف بعد."
          : lang === "hebrew"
          ? "- מספר הטלפון עדיין לא מוגדר."
          : "- Phone number is not configured yet.";
      
        const detailHeader = `${PL.detailTitle} #${index + 1}`;
      
        const body = `${detailHeader}
      
      ✨ *${name}* — ${price}
      📂 ${PL.category}: ${category}
      🆔 ${PL.sku}: ${sku}
      📝 ${descFull || "-"}
      
      📞 ${
          lang === "arabic"
            ? "للشراء الآن:"
            : lang === "hebrew"
            ? "להזמנה עכשיו:"
            : "To order now:"
        }
      ${phoneLine}
      
      ${PL.detailCta}`;
      
        await sendWhatsApp({
          from: biz.wa.number,
          to: from,
          body,
        });
      
        // נשארים ב־VIEW_PRODUCTS_LIST כדי שיוכל לשלוח עוד מספרים
        return res.sendStatus(200);
      }



    // ---- COURSE DETAILS FLOW after "view_courses" ----
    if (state.step === "VIEW_COURSES_LIST") {
        const CL = COURSE_LABELS[lang] || COURSE_LABELS.english;
        const index = parseMenuIndexFromText(txt);
        const courseIds = state.data?.courseIds || [];
      
        // בדיקה שהמספר תקין
        if (
          index == null ||
          index < 0 ||
          index >= courseIds.length
        ) {
          await sendWhatsApp({
            from: biz.wa.number,
            to: from,
            body:
              lang === "arabic"
                ? "من فضلك أرسلي رقم الدورة من القائمة، أو اكتبي *menu* للعودة للقائمة الرئيسية."
                : lang === "hebrew"
                ? "שלחי מספר קורס מהרשימה, או כתבי *menu* כדי לחזור לתפריט הראשי."
                : "Please send a course number from the list, or type *menu* to go back to the main menu.",
          });
          return res.sendStatus(200);
        }
      
        const courseId = courseIds[index];
        const course = await Course.findOne({
          _id: courseId,
          businessId: biz._id,
        });
      
        if (!course) {
          await sendWhatsApp({
            from: biz.wa.number,
            to: from,
            body:
              lang === "arabic"
                ? "هذه الدورة لم تعد متاحة. جرّبي دورة أخرى أو اكتبي *menu*."
                : lang === "hebrew"
                ? "הקורס הזה כבר לא זמין. נסי קורס אחר או כתבי *menu*."
                : "This course is no longer available. Try another one or type *menu*.",
          });
          return res.sendStatus(200);
        }
      
        // סידור המפגשים לפי תאריך + שעה
        const sessions = (course.sessions || [])
          .slice()
          .sort((a, b) => {
            const keyA = `${a.date}T${a.startTime}`;
            const keyB = `${b.date}T${b.startTime}`;
            return keyA.localeCompare(keyB);
          });
      
        const sessionsLines = sessions.length
          ? sessions
              .map((s) => {
                const timeRange = `${s.startTime}–${s.endTime}`;
                return `• ${s.date} — ${timeRange}`;
              })
              .join("\n")
          : "-";
      
        const detailHeader = `${CL.detailTitle} #${index + 1}`;
      
        const body = `${detailHeader}
      
      🎓 *${course.title}*${course.price ? ` — ${course.price}₪` : ""}
      
      👩‍🏫 ${CL.instructor}: ${course.instructor || "-"}
      👥 ${CL.capacity}: ${course.maxParticipants ?? "-"}
      🗓️ ${CL.sessionsHeader}:
      ${sessionsLines}
      
      📝 ${course.description || "-"}
      
      ${CL.detailCta}`;
      
        await sendWhatsApp({
          from: biz.wa.number,
          to: from,
          body,
        });
      
        // נשארים ב־VIEW_COURSES_LIST כדי שיוכלו לבחור עוד מספר
        return res.sendStatus(200);
      }  

    // ---- Default fallback ----
    const fallbackText = getConfigMessage(
      biz,
      langKey,
      "fallback",
      t(lang, "hint_menu")
    );

    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: fallbackText,
    });

    return res.sendStatus(200);
  } catch (err) {
    console.error("Twilio webhook error:", err);
    // Always 200 so Twilio doesn’t retry
    return res.sendStatus(200);
  }
});

module.exports = router;

