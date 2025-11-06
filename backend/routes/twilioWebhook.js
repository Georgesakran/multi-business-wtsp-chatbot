const express = require("express");
const router = express.Router();

const Business = require("../models/Business");
const Customer = require("../models/Customer");
const ConversationState = require("../models/ConversationState");
const { sendText, sendTemplate } = require("../utils/twilio");

// Helpers
const lower = (s) => String(s || "").toLowerCase().trim();
const nowISO = () => new Date().toISOString();

// Map button payloads → language code stored in Customer.language
const LANG_PAYLOADS = {
  LANG_AR: "arabic",
  LANG_EN: "english",
  LANG_HE: "hebrew"
};

async function upsertCustomer(bizId, phone) {
  const doc = await Customer.findOneAndUpdate(
    { businessId: bizId, phone },
    { $setOnInsert: { businessId: bizId, phone }, $set: { "stats.lastSeenAt": new Date() } },
    { new: true, upsert: true }
  );
  return doc;
}

async function getState(bizId, phone) {
  const doc = await ConversationState.findOneAndUpdate(
    { businessId: bizId, phoneNumber: phone },
    { $setOnInsert: { businessId: bizId, phoneNumber: phone, step: "LANG_PICK", data: {} } },
    { new: true, upsert: true }
  );
  return doc;
}

async function setState(state, patch) {
  const merged = {
    step: patch.step ?? state.step,
    data: patch.data ?? state.data
  };
  await ConversationState.updateOne(
    { _id: state._id },
    { $set: merged, $currentDate: { updatedAt: true } }
  );
  return { ...state.toObject(), ...merged };
}

// Extract interactive payload safely (Twilio sends different fields by content type)
function getIncomingPayload(body) {
  // For WhatsApp interactive replies Twilio commonly includes:
  // - ButtonText / ButtonPayload (quick reply buttons)
  // - ListPickerTitle / ListPickerSelection*, or falls back to Body
  if (body.ButtonPayload) return body.ButtonPayload;
  if (body.ListPickerPayload) return body.ListPickerPayload;
  return null;
}

router.post("/", async (req, res) => {
  try {
    const body = req.body;

    // E.164 without the "whatsapp:" prefix
    const from = String(body.From || "").replace("whatsapp:", "");
    const to   = String(body.To   || "").replace("whatsapp:", "");

    // Route to business by its WA number
    const biz = await Business.findOne({ "wa.number": to, isActive: true }).lean();
    if (!biz) {
      // Unknown number – ignore
      return res.sendStatus(200);
    }

    const messagingServiceSid = biz.wa?.messagingServiceSid || "";
    const langSelectSid = biz.wa?.templates?.languageSelectSid || "";
    const menuSidByLang = biz.wa?.templates?.menu || {};

    // Ensure customer + state
    const customer = await upsertCustomer(biz._id, from);
    let state = await getState(biz._id, from);

    const text = lower(body.Body);
    const payload = getIncomingPayload(body); // e.g., LANG_AR, LANG_EN, LANG_HE or custom

    // 1) If customer has no language yet: send the language picker template
    if (!customer.language || !["arabic","english","hebrew"].includes(customer.language)) {
      // If we received a language payload, save it
      if (payload && LANG_PAYLOADS[payload]) {
        const lang = LANG_PAYLOADS[payload];
        await Customer.updateOne({ _id: customer._id }, { $set: { language: lang } });
        // proceed to menu in that language
        const contentSid = menuSidByLang[ lang === "arabic" ? "ar" : lang === "hebrew" ? "he" : "en" ];
        if (contentSid) {
          await sendTemplate({
            from: biz.wa.number,
            to: from,
            contentSid,
            // Add ContentVariables if your menu template needs placeholder values
            contentVariables: {},
            messagingServiceSid
          });
          state = await setState(state, { step: "MENU", data: { chosenLang: lang } });
          return res.sendStatus(200);
        } else {
          // fallback text if you didn't set a menu template SID yet
          await sendText({
            from: biz.wa.number,
            to: from,
            body: lang === "arabic"
              ? "تم ضبط اللغة إلى العربية. لم يتم إعداد قائمة الأزرار بعد."
              : lang === "hebrew"
                ? "השפה נקבעה לעברית. תבנית התפריט טרם הוגדרה."
                : "Language set to English. Menu template is not configured yet.",
            messagingServiceSid
          });
          state = await setState(state, { step: "MENU", data: { chosenLang: lang } });
          return res.sendStatus(200);
        }
      }

      // If no payload yet, (re)send the language picker template
      if (langSelectSid) {
        await sendTemplate({
          from: biz.wa.number,
          to: from,
          contentSid: langSelectSid,
          contentVariables: {}, // if your language template has variables
          messagingServiceSid
        });
      } else {
        // Fallback text if template missing
        await sendText({
          from: biz.wa.number,
          to: from,
          body: [
            "Choose language:",
            "• العربية (send: LANG_AR)",
            "• English (send: LANG_EN)",
            "• עברית (send: LANG_HE)"
          ].join("\n"),
          messagingServiceSid
        });
      }
      state = await setState(state, { step: "LANG_PICK" });
      return res.sendStatus(200);
    }

    // 2) If language exists but we’re still at LANG_PICK (user typed something weird), just show the menu
    if (state.step === "LANG_PICK") {
      const lang = customer.language;
      const contentSid = menuSidByLang[ lang === "arabic" ? "ar" : lang === "hebrew" ? "he" : "en" ];
      if (contentSid) {
        await sendTemplate({
          from: biz.wa.number,
          to: from,
          contentSid,
          contentVariables: {},
          messagingServiceSid
        });
        state = await setState(state, { step: "MENU", data: { chosenLang: lang } });
        return res.sendStatus(200);
      }
      await sendText({
        from: biz.wa.number,
        to: from,
        body: "Menu template not configured yet.",
        messagingServiceSid
      });
      state = await setState(state, { step: "MENU", data: { chosenLang: customer.language } });
      return res.sendStatus(200);
    }

    // 3) Handle menu button payloads (you’ll wire these to booking/product/info later)
    // Example payloads you can program in the Twilio Content template:
    // MENU_BOOK, MENU_FAQ, MENU_HOURS, MENU_TALK_TO_AGENT, etc.
    if (state.step === "MENU") {
      const p = payload || text; // prefer payload, fallback to free text if you want

      switch ((p || "").toUpperCase()) {
        case "MENU_BOOK":
          // TODO: send booking service template (askServiceSid)
          // await sendTemplate({ ...biz/consumer..., contentSid: biz.wa.templates.booking.askServiceSid })
          await sendText({
            from: biz.wa.number,
            to: from,
            body: "Booking flow coming next (templates to be added).",
            messagingServiceSid
          });
          await setState(state, { step: "BOOKING_SERVICE", data: {} });
          return res.sendStatus(200);

        case "MENU_FAQ":
          await sendText({
            from: biz.wa.number,
            to: from,
            body: "FAQ coming next (you can attach a FAQ content template too).",
            messagingServiceSid
          });
          return res.sendStatus(200);

        default:
          // If user typed or tapped something unknown, just re-show menu
          const lang = customer.language;
          const contentSid = menuSidByLang[ lang === "arabic" ? "ar" : lang === "hebrew" ? "he" : "en" ];
          if (contentSid) {
            await sendTemplate({
              from: biz.wa.number,
              to: from,
              contentSid,
              contentVariables: {},
              messagingServiceSid
            });
          } else {
            await sendText({
              from: biz.wa.number,
              to: from,
              body: "Please choose an option from the menu.",
              messagingServiceSid
            });
          }
          return res.sendStatus(200);
      }
    }

    // 4) Default fallback
    await sendText({
      from: biz.wa.number,
      to: from,
      body: "Type 'menu' to open options.",
      messagingServiceSid
    });
    return res.sendStatus(200);

  } catch (err) {
    console.error("Twilio webhook error:", err?.response?.data || err);
    // Always 200 so Twilio doesn’t retry
    return res.sendStatus(200);
  }
});

module.exports = router;