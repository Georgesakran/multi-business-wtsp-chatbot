// controllers/chatbotEntryController.js
const stateManager = require("../state/stateManager");
const languageController = require("./languageController");
const menuController = require("./menuController");
const bookingController = require("./bookingController");
const fallbackController = require("./fallbackController");

const customerService = require("../services/customerService");

const { isListPickerSelection } = require("../utils/parsing");
const { log, error } = require("../utils/logger");

module.exports = {
  /**
   * MAIN ENTRY POINT FOR ALL WHATSAPP MESSAGES
   */
  async handleIncomingMessage({ req, res, biz, from, to, body, payload }) {
    try {
      log("📥 Incoming:", { from, to, body });

      // 1) Load state
      let state = await stateManager.getState(biz._id, from);

      // 2) Load or create customer (CRITICAL FIX!!)
      let customer = await customerService.getOrCreateCustomer(biz._id, from);

      // 3) Determine language (customer > business)
      const lang = customer.language || biz.config?.language || "english";

      // -------------------------
      // (A) MENU COMMAND
      // -------------------------
      if (body.toLowerCase().trim() === "menu") {
        await menuController.showMainMenu({ biz, from, lang, customer, state });
        return res.sendStatus(200);
      }

      // -------------------------
      // (B) LIST PICKER HANDLING
      // -------------------------
      if (isListPickerSelection(payload)) {
        return await this.handleListPickerSelection({
          payload,
          biz,
          from,
          to,
          state,
          customer,
          lang,
          res
        });
      }

      // -------------------------
      // (C) BOOKING FLOW
      // (processStep DOES NOT EXIST → FIX)
      // -------------------------
      if (state?.step?.startsWith("BOOKING_")) {

        await bookingController.process({
          biz,
          from,
          to,
          body,
          state,
          customer,
          lang
        });

        return res.sendStatus(200);
      }

      // -------------------------
      // (D) LANGUAGE SWITCH
      // -------------------------
      if (languageController.isLanguageSwitch(body)) {
        await languageController.setLanguage({
          biz,
          from,
          to,
          body,
          state,
          customer
        });
        return res.sendStatus(200);
      }

      // -------------------------
      // (E) MENU SELECTION
      // -------------------------
      const menuHandled = await menuController.handleMenuSelection({
        biz,
        from,
        to,
        body,
        lang,
        customer,
        state
      });

      if (menuHandled) {
        return res.sendStatus(200);
      }

      // -------------------------
      // (F) FALLBACK
      // -------------------------
      await fallbackController.sendFallbackMessage({
        biz,
        from,
        to,
        lang
      });

      return res.sendStatus(200);

    } catch (err) {
      error("❌ chatbotEntryController error:", err);
      return res.sendStatus(500);
    }
  },

  /**
   * HANDLE TWILIO LIST PICKER
   */
  async handleListPickerSelection({ payload, biz, from, to, state, customer, lang, res }) {
    try {
      const selectionId =
        payload?.Interactive?.ListReply?.Id ||
        payload?.interactive?.list_reply?.id;

      if (!selectionId) {
        error("⚠️ List picker: Missing selection ID");
        return res.sendStatus(200);
      }

      // DATE Selection
      if (selectionId.startsWith("DATE_")) {
        const selectedDate = selectionId.replace("DATE_", "");
        await bookingController.dateSelected({
          biz,
          from,
          to,
          state,
          customer,
          selectedDate,
          lang
        });
        return res.sendStatus(200);
      }

      // TIME Selection
      if (selectionId.startsWith("TIME_")) {
        const selectedTime = selectionId.replace("TIME_", "");
        await bookingController.timeSelected({
          biz,
          from,
          to,
          state,
          customer,
          selectedTime,
          lang
        });
        return res.sendStatus(200);
      }

      log("⚠️ Unknown list picker payload:", selectionId);
      return res.sendStatus(200);

    } catch (err) {
      error("❌ handleListPickerSelection error:", err);
      return res.sendStatus(500);
    }
  }

};