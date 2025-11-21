// controllers/bookingController.js

const stateManager = require("../state/stateManager");
const customerService = require("../services/customerService");
const {
  sendWhatsApp,
  sendTemplate,
} = require("../services/messaging/twilioService");

const datePickerService = require("../services/booking/datePickerService");
const slotService = require("../services/booking/slotService");
const bookingService = require("../services/booking/bookingService");
const { t } = require("../utils/i18n");

module.exports = {
  // -----------------------------------------------------
  // Step 1: After service selected → send date picker
  // -----------------------------------------------------
  askForDate: async ({ biz, from, customer, state }) => {
    const lang = customer.language;
    const days = await datePickerService.getNextAvailableDays(biz);

    await stateManager.setState(state, {
      step: "BOOKING_SELECT_DATE_LIST",
      data: { ...state.data, days },
    });

    await datePickerService.sendDatePickerTemplate(biz, from, days, lang);
  },

  // -----------------------------------------------------
  // Step 2: Handle chosen date from the list
  // -----------------------------------------------------
  handleDateChosen: async ({ biz, from, customer, state, text }) => {
    const lang = customer.language;

    const dayIndex = parseInt(text) - 1;
    const days = state.data?.days || [];

    if (dayIndex < 0 || dayIndex >= days.length) {
      return sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: t(lang, "invalid_date"),
      });
    }

    const chosenDate = days[dayIndex];

    await stateManager.setState(state, {
      step: "BOOKING_SELECT_DATE",
      data: { ...state.data, date: chosenDate },
    });

    // forward for next state
    return module.exports.askForTime({ biz, from, customer, state, text: chosenDate });
  },

  // -----------------------------------------------------
  // Step 3: Show available time slots
  // -----------------------------------------------------
  askForTime: async ({ biz, from, customer, state, text }) => {
    const lang = customer.language;

    const date = text;
    const freeSlots = await slotService.getFreeSlotsForDate(biz, state.data, date);

    if (!freeSlots.length) {
      return sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: t(lang, "no_slots"),
      });
    }

    const display = freeSlots
      .slice(0, 10)
      .map((s, i) => `${i + 1}) ${s}`)
      .join("\n");

    await stateManager.setState(state, {
      step: "BOOKING_SELECT_TIME",
      data: { ...state.data, slots: freeSlots },
    });

    const msg =
      lang === "arabic"
        ? `3️⃣ الأوقات المتاحة:\n\n${display}\n\nأرسل رقم الوقت المناسب.`
        : lang === "hebrew"
        ? `3️⃣ השעות הפנויות:\n\n${display}\n\nבחר/י מספר שעה.`
        : `3️⃣ Available times:\n\n${display}\n\nReply with a time number.`;

    await sendWhatsApp({ from: biz.wa.number, to: from, body: msg });
  },

  // -----------------------------------------------------
  // Step 4: Time chosen → ask for name
  // -----------------------------------------------------
  handleTimeChosen: async ({ biz, from, customer, state, text }) => {
    const lang = customer.language;
    const slots = state.data?.slots || [];

    const index = parseInt(text) - 1;
    if (index < 0 || index >= slots.length) {
      return sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: t(lang, "invalid_time"),
      });
    }

    const time = slots[index];

    await stateManager.setState(state, {
      step: "BOOKING_ENTER_NAME",
      data: { ...state.data, time },
    });

    const msg =
      lang === "arabic"
        ? `⏰ تم اختيار الوقت: *${time}*\n\n4️⃣ أرسل اسمك الكامل.`
        : lang === "hebrew"
        ? `⏰ נבחרה שעה: *${time}*\n\n4️⃣ כתוב/י את שמך המלא.`
        : `⏰ Time selected: *${time}*\n\n4️⃣ Please send your full name.`;

    await sendWhatsApp({ from: biz.wa.number, to: from, body: msg });
  },

  // -----------------------------------------------------
  // Step 5: Save name → ask for notes
  // -----------------------------------------------------
  handleName: async ({ biz, from, customer, state, text }) => {
    const lang = customer.language;

    if (text.length < 2) {
      return sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: t(lang, "name_too_short"),
      });
    }

    await stateManager.setState(state, {
      step: "BOOKING_ENTER_NOTE",
      data: { ...state.data, customerName: text },
    });

    const msg =
      lang === "arabic"
        ? "5️⃣ هل لديك ملاحظات؟ أرسلها أو أرسل 0."
        : lang === "hebrew"
        ? "5️⃣ האם יש הערות? כתוב/י או שלחי 0."
        : "5️⃣ Any notes? Write them or send 0.";

    await sendWhatsApp({ from: biz.wa.number, to: from, body: msg });
  },

  // -----------------------------------------------------
  // Step 6: Save booking in DB
  // -----------------------------------------------------
  handleFinalize: async ({ biz, from, customer, state, text }) => {
    const lang = customer.language;

    const notes = text === "0" ? "" : text;

    const booking = await bookingService.createBooking(biz, from, state.data, notes, lang);

    await stateManager.resetState(state);

    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: booking.confirmationMessage,
    });
  },
};


