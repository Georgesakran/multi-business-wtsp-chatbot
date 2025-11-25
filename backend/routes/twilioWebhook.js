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
const { shortText } = require("../utils/misc/textHelpers");
// language helpers
const { getLocalized } = require("../utils/language/localization");
const {t, langFromCustomer, langKeyFromCustomer, langKeyFromChoice} = require("../utils/language/languageTextHelper");
const {parseLanguageChoice} = require ("../utils/language/languageParser");
const PRODUCT_LABELS = require("../utils/language/labels/productLabels");
const COURSE_LABELS = require("../utils/language/labels/courseLabels");

// MENU Lang helpers
const { getVisibleMenuItemsSorted } = require("../utils/language/menu/menuUtils");
const {getConfigMessage} = require("../utils/config/configMessageHelper");
const {buildMenuText} = require("../utils/language/menu/menuBuilder");
const parseMenuIndexFromText = require("../utils/language/menu/menuParser");


// Time + Booking Helpers
const {
  checkFreeSlotsToday,
  slotsNeeded,
  findServiceById,
  getTakenMap,
  isRangeFree
} = require("../utils/time/bookingHelpers");


// System Constants Helpers
const {BACK, CANCEL} = require("../utils/constants/systemConstants");

//Twilio
const sendDatePickerTemplate =require("../utils/twilio/sendDatePickerTemplate");
const { sendWhatsApp, sendTemplate } = require("../utils/twilio/sendTwilio");
const { sendLanguageTemplate, sendLanguageFallback } = require("../utils/twilio/sendLanguageHelpers");


const lower = (s) => String(s || "").toLowerCase();
// ---------- language parsing / mapping ----------
function productText(fieldObj, langKey) {
  return getLocalized(fieldObj, langKey);
}

const handleMenuAction = require("../utils/menuControllers/handleMenuAction");

// -------------------- webhook --------------------
router.post("/", async (req, res) => {
  try {

    // -------------------- constants & helpers --------------------
    const from = toE164(req.body?.From); // customer WA number
    const to = toE164(req.body?.To); // business WA number
    const rawText = (req) => (req.body?.Body || "").trim();
    const txt = rawText(req);
    const isCancelCmd = (txt) => txt === CANCEL || lower(txt) === "cancel";
    const isRestartCmd = (txt) =>["restart", "/restart", "start"].includes(lower(txt));
    const isHelpCmd = (txt) => ["help", "?", "instructions"].includes(lower(txt));
    const weekdayFromISO = (iso) =>
      new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" });
   

    const biz = await Business.findOne({ "wa.number": to, isActive: true });
    if (!biz) return res.sendStatus(200);

    // Load state + customer
    let state = await getState({ businessId: biz._id, phoneNumber: from });
    let customer = await Customer.findOne({ businessId: biz._id, phone: from });
    const lang = langFromCustomer(customer, biz);
    const langKey = langKeyFromCustomer(customer, biz);

    // Global commands
    if (isHelpCmd(txt)) {
      const lang = langFromCustomer(customer, biz);
      await sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: t(lang, "help"),
      });
      return res.sendStatus(200);
    }

    if (isRestartCmd(txt)) {
      state = await setState(state, { step: "LANGUAGE_SELECT", data: {} });
      const sent = await sendLanguageTemplate(biz, from);
      if (!sent) await sendLanguageFallback(biz, from);
      return res.sendStatus(200);
    }

    if (isCancelCmd(txt)) {
      const lang = langFromCustomer(customer, biz);
      await setState(state, { step: "LANGUAGE_SELECT", data: {} });
      await sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: t(lang, "cancelled"),
      });
      return res.sendStatus(200);
    }

    
    // 4) Language selection flow
    if (!customer || !customer.language) {
      // not yet choosing → send template
      if (state.step !== "LANGUAGE_SELECT") {
        await setState(state, { step: "LANGUAGE_SELECT" });
        const sent = await sendLanguageTemplate(biz, from);
        if (!sent) await sendLanguageFallback(biz, from);
        return res.sendStatus(200);
      }

      // already in LANGUAGE_SELECT → parse choice
      const choice = parseLanguageChoice(txt);

      if (!choice) {
        const sent = await sendLanguageTemplate(biz, from);
        if (!sent) await sendLanguageFallback(biz, from);
        return res.sendStatus(200);
      }

      const wasFirstTime = !customer;

      // upsert customer with language
      customer = await Customer.findOneAndUpdate(
        { businessId: biz._id, phone: from },
        {
          $setOnInsert: { businessId: biz._id, phone: from },
          $set: { language: choice, "stats.lastSeenAt": new Date() },
        },
        { new: true, upsert: true }
      );

      await setState(state, { step: "MENU", data: { language: choice } });

      const langKey = langKeyFromChoice(choice);
      const msgType = wasFirstTime ? "welcome_first" : "welcome_returning";

      const welcomeText = getConfigMessage(
        biz,
        langKey,
        msgType,
        t(choice, "welcome")
      );

      const menuText = buildMenuText(biz, langKey, choice);

      // send welcome
      await sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: welcomeText,
      });

      // send menu right after
      await sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: menuText,
      });

      return res.sendStatus(200);
    }



    // ---- MENU command ----
    if (lower(txt) === "menu") {
      const menuText = buildMenuText(biz, langKey, lang);

      await sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: menuText,
      });
      await setState(state, { step: "MENU" });
      return res.sendStatus(200);
    }

        // ---- MENU selection logic ----
        if (state.step === "MENU") {
          const structuredItems = getVisibleMenuItemsSorted(biz);

          if (structuredItems.length) {
            const index = parseMenuIndexFromText(txt);

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
              return res.sendStatus(200);
            }

            const item = structuredItems[index];
            const action = item.action || "custom";
            const payload = item.payload || "";

            await handleMenuAction({ action, payload, lang, langKey, biz, state, from });
            return res.sendStatus(200);
          }

          // if somehow no structured items while in MENU
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
          return res.sendStatus(200);
        }

        // ---- BOOKING: SELECT SERVICE ----
        if (state.step === "BOOKING_SELECT_SERVICE") {
          const serviceIds = state.data?.serviceIds || [];
          const index = parseMenuIndexFromText(txt);
    
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
            return res.sendStatus(200);
          }
    
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
            return res.sendStatus(200);
          }
    
          const key = langKey; // 'ar' | 'en' | 'he'
          const svcName = svc.name?.[key] || svc.name?.en || "";
    
          // snapshot like in bookingsRoutes
          const serviceSnapshot = {
            name: {
              en: svc.name?.en || "",
              ar: svc.name?.ar || "",
              he: svc.name?.he || "",
            },
            price: Number(svc.price || 0),
            duration: Number(svc.duration || 0),
          };
    
          const rawDays = getNext10Days(biz);
          let days = [...rawDays];
          const todayStr = moment().format("YYYY-MM-DD");
          
          if (days.includes(todayStr)) {
            const hasFree = await checkFreeSlotsToday(biz);
            if (!hasFree) days = days.filter((d) => d !== todayStr);
          }
          
          await setState(state, {
            step: "BOOKING_SELECT_DATE_LIST",
            data: {
              serviceId: selectedServiceId,
              serviceSnapshot,
              days,
            },
          });
          
          // send Twilio Template
          await sendDatePickerTemplate(biz, from, days, lang);
          return res.sendStatus(200);
    
        }
    
        if (state.step === "BOOKING_SELECT_DATE_LIST") {
          const days = state.data?.days || [];
          const idx = parseMenuIndexFromText(txt);
        
          if (idx == null || idx < 0 || idx >= days.length) {
            await sendWhatsApp({
              from: biz.wa.number,
              to: from,
              body:
                lang === "arabic"
                  ? "من فضلك اختاري رقم تاريخ صحيح من القائمة."
                  : lang === "hebrew"
                  ? "בחרי מספר תאריך מהרשימה."
                  : "Please select a valid date number.",
            });
            return res.sendStatus(200);
          }
        
          const chosenDate = days[idx];
        
          await setState(state, {
            step: "BOOKING_SELECT_DATE",
            data: {
              ...state.data,
              date: chosenDate,
            },
          });
        
          req.body.Body = chosenDate;  
          //const newTxt = chosenDate;

        }

        // ---- BOOKING: SELECT DATE (show available slots) ----
        if (state.step === "BOOKING_SELECT_DATE") {
          const date = req.body.Body || txt;
          const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));

          if (!isDate(date)) {
            await sendWhatsApp({
              from: biz.wa.number,
              to: from,
              body:
                lang === "arabic"
                  ? "📅 من فضلك اكتبي التاريخ بصيغة صحيحة: *YYYY-MM-DD* (مثال: 2025-12-05)."
                  : lang === "hebrew"
                  ? "📅 בבקשה כתבי את התאריך בפורמט *YYYY-MM-DD* (לדוגמה: 2025-12-05)."
                  : "📅 Please send the date in format *YYYY-MM-DD* (e.g. 2025-12-05).",
            });
            return res.sendStatus(200);
          }
    
          const bookingCfg = biz.config?.booking || {};
          const workingDays = Array.isArray(bookingCfg.workingDays)
            ? bookingCfg.workingDays
            : [];
          const openingTime = bookingCfg.openingTime || "09:00";
          const closingTime = bookingCfg.closingTime || "18:00";
          const gap = Number(bookingCfg.slotGapMinutes || 15);
    
          // closed date?
          if ((biz.closedDates || []).includes(date)) {
            await sendWhatsApp({
              from: biz.wa.number,
              to: from,
              body:
                lang === "arabic"
                  ? "❌ في هذا التاريخ الصالون مغلق. اختاري تاريخاً آخر."
                  : lang === "hebrew"
                  ? "❌ בתאריך זה העסק סגור. אנא בחרי תאריך אחר."
                  : "❌ The business is closed on that date. Please choose another date.",
            });
            return res.sendStatus(200);
          }
    
          const weekday = weekdayFromISO(date);
          if (!workingDays.includes(weekday)) {
            await sendWhatsApp({
              from: biz.wa.number,
              to: from,
              body:
                lang === "arabic"
                  ? `❌ يوم ${weekday} ليس من أيام العمل. اختاري يوماً آخر.`
                  : lang === "hebrew"
                  ? `❌ יום ${weekday} אינו יום עבודה. בחרי יום אחר.`
                  : `❌ ${weekday} is not a working day. Please choose a different date.`,
            });
            return res.sendStatus(200);
          }
    
          const grid = makeDayGrid(openingTime, closingTime, gap);
          const taken = await getTakenMap(biz._id, date);
    
          const serviceId = state.data?.serviceId;
          const snapshot = state.data?.serviceSnapshot || {};
          let need = 1;
          if (snapshot.duration) {
            need = slotsNeeded(snapshot.duration, gap);
          } else if (serviceId) {
            const svc = findServiceById(biz, serviceId);
            if (svc?.duration) {
              need = slotsNeeded(Number(svc.duration), gap);
            }
          }
    
          const free = [];
          for (let i = 0; i < grid.length; i++) {
            if (isRangeFree(grid, taken, i, need)) free.push(grid[i]);
          }
    
          if (!free.length) {
            await sendWhatsApp({
              from: biz.wa.number,
              to: from,
              body:
                lang === "arabic"
                  ? "⚠️ في هذا التاريخ لا يوجد أوقات متاحة. حاولي تاريخاً آخر."
                  : lang === "hebrew"
                  ? "⚠️ אין שעות פנויות בתאריך הזה. נסי תאריך אחר."
                  : "⚠️ There are no free time slots on that date. Please choose another date.",
            });
            return res.sendStatus(200);
          }
    
          const slotsToShow = free.slice(0, 10); // show up to 10 options
          const lines = slotsToShow.map((t, i) => `${i + 1}) ${t}`);
    
          await setState(state, {
            step: "BOOKING_SELECT_TIME",
            data: {
              ...state.data,
              date,
              slots: slotsToShow,
              slotGapMinutes: gap,
              openingTime,
              closingTime,
            },
          });
    
          const msg =
            lang === "arabic"
              ? `3️⃣ الأوقات المتاحة في *${date}*:\n\n${lines.join(
                  "\n"
                )}\n\n💬 أرسلي رقم الوقت المناسب لك.`
              : lang === "hebrew"
              ? `3️⃣ השעות הפנויות ב-*${date}*:\n\n${lines.join(
                  "\n"
                )}\n\n💬 כתבי את מספר השעה המתאימה.`
              : `3️⃣ Available times on *${date}*:\n\n${lines.join(
                  "\n"
                )}\n\n💬 Please reply with the number of your preferred time.`;
    
          await sendWhatsApp({
            from: biz.wa.number,
            to: from,
            body: msg,
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
      
        // 2️⃣ ואז שולחים את פרטי המוצר
        const stockLine =
          stock != null ? `\n📦 ${PL.stock}: ${stock}` : "";
      
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
      🆔 ${PL.sku}: ${sku}${stockLine}
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

