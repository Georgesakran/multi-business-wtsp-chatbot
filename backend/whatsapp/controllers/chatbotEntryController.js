// controllers/chatbotEntryController.js
const stateManager = require("../state/stateManager");
const languageController = require("./languageController");
const menuController = require("./menuController");
const bookingController = require("./booking/bookingController");
const fallbackController = require("./fallbackController");
const { detectLanguage } = require("../utils/i18n");
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
      const state = await stateManager.getState(biz._id, from);

      // 2) Detect language from business config
      const lang = biz.config?.language || "arabic";

      // 3) Handle MENU command
      if (body.toLowerCase().trim() === "menu") {
        await menuController.showMainMenu({ biz, from, to, lang, state });
        return res.sendStatus(200);
      }

      // 4) Detect Twilio List Picker Click
      if (isListPickerSelection(payload)) {
        return await this.handleListPickerSelection({
          payload,
          biz,
          from,
          to,
          state,
          lang,
          res
        });
      }

      // 5) Route based on current flow step
      if (state?.step?.startsWith("BOOKING_")) {
        await bookingController.processStep({
          biz,
          from,
          to,
          body,
          state,
          lang,
        });
        return res.sendStatus(200);
      }

      // 6) Language switching
      if (languageController.isLanguageSwitch(body)) {
        await languageController.setLanguage({
          biz,
          from,
          to,
          body,
          state,
        });
        return res.sendStatus(200);
      }

      // 7) Detect main menu number selection
      const menuHandled = await menuController.handleMenuSelection({
        biz,
        from,
        to,
        body,
        lang,
        state,
      });
      if (menuHandled) {
        return res.sendStatus(200);
      }

      // 8) Fallback
      await fallbackController.sendFallbackMessage({
        biz,
        from,
        to,
        lang,
      });

      return res.sendStatus(200);
    } catch (err) {
      error("❌ chatbotEntryController error:", err);
      return res.sendStatus(500);
    }
  },

  /**
   * Handles Twilio List Picker clicks
   */
  async handleListPickerSelection({ payload, biz, from, to, state, lang, res }) {
    try {
      const selectionId =
        payload?.Interactive?.ListReply?.Id ||
        payload?.interactive?.list_reply?.id;

      if (!selectionId) {
        error("⚠️ List picker: Missing selection ID");
        return res.sendStatus(200);
      }

      // DATE Selection = "DATE_2025-01-06"
      if (selectionId.startsWith("DATE_")) {
        const selectedDate = selectionId.replace("DATE_", "");
        await bookingController.dateSelected({
          biz,
          from,
          to,
          state,
          selectedDate,
          lang,
        });
        return res.sendStatus(200);
      }

      // TIME Selection = "TIME_10:30"
      if (selectionId.startsWith("TIME_")) {
        const selectedTime = selectionId.replace("TIME_", "");
        await bookingController.timeSelected({
          biz,
          from,
          to,
          state,
          selectedTime,
          lang,
        });
        return res.sendStatus(200);
      }

      log("⚠️ Unknown list picker payload:", selectionId);
      return res.sendStatus(200);
    } catch (err) {
      error("❌ handleListPickerSelection error:", err);
      return res.sendStatus(500);
    }
  },
};