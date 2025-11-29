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
          const slots = state.data?.slots || [];
          const idx = parseMenuIndexFromText(txt);
    
          if (idx == null || idx < 0 || idx >= slots.length) {
            const lines = slots.map((t, i) => `${i + 1}) ${t}`);
            await sendWhatsApp({
              from: biz.wa.number,
              to: from,
              body:
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
                    )}\n\nOr type *menu* to go back.`,
            });
            return res.sendStatus(200);
          }
    
          const time = slots[idx];
    
          await setState(state, {
            step: "BOOKING_ENTER_NAME",
            data: {
              ...state.data,
              time,
            },
          });
    
          const msg =
            lang === "arabic"
              ? `✅ تم اختيار الوقت: *${time}*\n\n4️⃣ اكتب/ي اسمك الكامل للحجز.`
              : lang === "hebrew"
              ? `✅ נבחרה שעה: *${time}*\n\n4️⃣ כתב/י את שמך המלא להזמנה.`
              : `✅ Time selected: *${time}*\n\n4️⃣ Please send your full name for the booking.`;
    
          await sendWhatsApp({
            from: biz.wa.number,
            to: from,
            body: msg,
          });
    
          return res.sendStatus(200);
        }
    
        // ---- BOOKING: ENTER NAME ----
        if (state.step === "BOOKING_ENTER_NAME") {
          const name = txt;
          if (!name || name.length < 2) {
            await sendWhatsApp({
              from: biz.wa.number,
              to: from,
              body:
                lang === "arabic"
                  ? "من فضلك اكتب/ي اسمًا واضحًا (على الأقل حرفين)."
                  : lang === "hebrew"
                  ? "נא לכתוב שם ברור (לפחות שני תווים)."
                  : "Please send a clear name (at least 2 characters).",
            });
            return res.sendStatus(200);
          }
    
          await setState(state, {
            step: "BOOKING_ENTER_NOTE",
            data: {
              ...state.data,
              customerName: name,
            },
          });
    
          const msg =
            lang === "arabic"
              ? "5️⃣ هل لديك ملاحظات خاصة !! (مثال: لون/شكل/معلومة إضافية)؟\nاكتب/ي ما تريدين، أو اكتب/ي *0* إذا لا توجد ملاحظات."
              : lang === "hebrew"
              ? "5️⃣ יש לך הערות מיוחדות (צבע, צורה, בקשה נוספת)?\nכתב/י מה שצריך, או כתב/י *0* אם אין הערות."
              : "5️⃣ Any special notes (e.g. style, color, anything extra)?\nWrite your note, or send *0* if you have no notes.";
    
          await sendWhatsApp({
            from: biz.wa.number,
            to: from,
            body: msg,
          });
    
          return res.sendStatus(200);
        }
    
        // ---- BOOKING: ENTER NOTE + CREATE BOOKING ----
        if (state.step === "BOOKING_ENTER_NOTE") {
          let notes = txt;
          if (notes === "0" || lower(txt) === "skip") {
            notes = "";
          }

          const { serviceId, serviceSnapshot, date, time, customerName } =
            state.data || {};

          if (!serviceId || !date || !time || !customerName) {
            // something went wrong in state
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
            await setState(state, { step: "MENU", data: {} });
            return res.sendStatus(200);
          }

          try {
            const bookingCfg = biz.config?.booking || {};
            const workingDays = Array.isArray(bookingCfg.workingDays)
              ? bookingCfg.workingDays
              : [];
            const weekday = weekdayFromISO(date);

            if ((biz.closedDates || []).includes(date)) {
              throw new Error("Business closed on that date");
            }
            if (!workingDays.includes(weekday)) {
              throw new Error("Selected date is not a working day");
            }

            const openingTime = bookingCfg.openingTime || "09:00";
            const closingTime = bookingCfg.closingTime || "18:00";
            const gap = Number(bookingCfg.slotGapMinutes || 15);
            const grid = makeDayGrid(openingTime, closingTime, gap);
            const idx = grid.indexOf(time);
            if (idx === -1) {
              throw new Error("Time is outside working hours");
            }

            let need = 1;
            if (serviceSnapshot?.duration) {
              need = slotsNeeded(serviceSnapshot.duration, gap);
            }

            const taken = await getTakenMap(biz._id, date);
            if (!isRangeFree(grid, taken, idx, need)) {
              throw new Error("Slot already taken");
            }

            // ✅ decide default status from business config
            const defaultStatus =
              biz?.config?.booking?.chatbotDefaultStatus === "confirmed"
                ? "confirmed"
                : "pending"; // safe fallback

            // ✅ create booking using CORRECT variables
            const booking = await Booking.create({
              businessId: biz._id,
              customerName,
              phoneNumber: from,
              serviceId: serviceId,
              serviceSnapshot: serviceSnapshot,
              date,
              time,
              status: defaultStatus,
              source: "chatbot", // important: for stats
              notes,
            });

            // reset state back to MENU
            await setState(state, { step: "MENU", data: {} });

            const key = langKey;
            const svcName =
              serviceSnapshot?.name?.[key] ||
              serviceSnapshot?.name?.en ||
              "";

            const isAutoConfirmed = defaultStatus === "confirmed";

            let msg;
            if (lang === "arabic") {
              msg = isAutoConfirmed
                ? `✅ تم إنشاء حجزك *وتأكيده* بنجاح!\n\n👤 الاسم: *${booking.customerName}*\n💅 الخدمة: *${svcName}*\n📅 التاريخ: *${booking.date}*\n⏰ الساعة: *${booking.time}*\n\nيمكنك دائماً كتابة *menu* للعودة للقائمة.`
                : `✅ تم إنشاء حجزك بنجاح!\n\n👤 الاسم: *${booking.customerName}*\n💅 الخدمة: *${svcName}*\n📅 التاريخ: *${booking.date}*\n⏰ الساعة: *${booking.time}*\n\nسيتم تأكيد الموعد قريباً. يمكنك دائماً كتابة *menu* للعودة للقائمة.`;
            } else if (lang === "hebrew") {
              msg = isAutoConfirmed
                ? `✅ ההזמנה שלך נוצרה ו*אושרה* בהצלחה!\n\n👤 שם: *${booking.customerName}*\n💅 שירות: *${svcName}*\n📅 תאריך: *${booking.date}*\n⏰ שעה: *${booking.time}*\n\nאפשר בכל רגע לכתוב *menu* כדי לחזור לתפריט.`
                : `✅ ההזמנה שלך נוצרה בהצלחה!\n\n👤 שם: *${booking.customerName}*\n💅 שירות: *${svcName}*\n📅 תאריך: *${booking.date}*\n⏰ שעה: *${booking.time}*\n\nהאישור הסופי יגיע בהמשך. אפשר בכל רגע לכתוב *menu* כדי לחזור לתפריט.`;
            } else {
              msg = isAutoConfirmed
                ? `✅ Your booking has been *created and confirmed*!\n\n👤 Name: *${booking.customerName}*\n💅 Service: *${svcName}*\n📅 Date: *${booking.date}*\n⏰ Time: *${booking.time}*\n\nYou can type *menu* anytime to go back.`
                : `✅ Your booking has been created!\n\n👤 Name: *${booking.customerName}*\n💅 Service: *${svcName}*\n📅 Date: *${booking.date}*\n⏰ Time: *${booking.time}*\n\nThe appointment will be confirmed shortly. You can type *menu* anytime to go back.`;
            }

            await sendWhatsApp({
              from: biz.wa.number,
              to: from,
              body: msg,
            });

            return res.sendStatus(200);
          } catch (err) {
            console.error("Booking via WhatsApp error:", err);

            const msg =
              lang === "arabic"
                ? "❌ لم نتمكن من تأكيد هذا الموعد (ربما الحجز ممتلئ أو التوقيت غير متاح). اكتبي *menu* وحاول/ي من جديد."
                : lang === "hebrew"
                ? "❌ לא הצלחנו לאשר את התור (אולי השעה נתפסה בינתיים). כתבי *menu* ונסי שוב."
                : "❌ We couldn’t confirm this booking (maybe the time was just taken). Please type *menu* and try again.";

            await sendWhatsApp({
              from: biz.wa.number,
              to: from,
              body: msg,
            });

            await setState(state, { step: "MENU", data: {} });
            return res.sendStatus(200);
          }
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

