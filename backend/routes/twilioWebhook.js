const express = require("express");
const router = express.Router();

// Models
const Business = require("../models/Business");
const Customer = require("../models/Customer");

// Helpers
const getState = require("../utils/states/getState");
const setState = require("../utils/states/setState");

// Misc helpers
const { toE164 } = require("../utils/misc/phoneHelpers");

// MENU Lang helpers
const getConfigMessage= require("../utils/config/configMessageHelper");

// System Constants Helpers
const {BACK, CANCEL} = require("../utils/constants/systemConstants");

//Twilio
const {sendWhatsApp} = require("../utils/twilio/sendTwilio");

// Webhook Imports Helpers Functions
const { handleHelp, handleRestart ,handleCancel , showMenu} = require("./twilioFlows/global/commands");
const askLanguage = require("./twilioFlows/language/askLanguage");
const handleLanguageChoice = require("./twilioFlows/language/handleLanguageChoice");
const {langFromCustomer} = require("../utils/language/languageTextHelper");
const lower = (s) => String(s || "").toLowerCase();

// HANDLE STEPS 
const handleMenuStep = require("../utils/states/stepStates/handleMenuState");
const handleBookingSelectService = require("../utils/states/stepStates/handleBookingSelectService");
const handleBookingSelectDateList = require("../utils/states/stepStates/handleBookingSelectDateList");
const handleBookingSelectDate = require("../utils/states/stepStates/handleBookingSelectDate");
const handleBookingSelectTime = require("../utils/states/stepStates/handleBookingSelectTime");
const handleBookingEnterName = require("../utils/states/stepStates/handleBookingEnterName");
const handleBookingEnterNote = require("../utils/states/stepStates/handleBookingEnterNote");
const handleViewProductsList = require("../utils/states/stepStates/handleViewProductsList");
const handleViewCoursesList = require("../utils/states/stepStates/handleViewCoursesList");

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
        langKey,
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
          return handleViewProductsList({
            biz,
            from,
            customer,
            lang,
            txt,
            state,
            res,
          });
    }
    // ---- COURSE DETAILS FLOW after "view_courses" -------
    if (state.step === "VIEW_COURSES_LIST") {
      return handleViewCoursesList({
        txt,
        biz,
        from,
        lang,
        state,
        res,
      });
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