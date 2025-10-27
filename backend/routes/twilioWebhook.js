const express = require("express");
const router = express.Router();
const axios = require("axios");
const Business = require("../models/Business");

const TWILIO_BASE_URL = "https://api.twilio.com/2010-04-01";
const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FLOW_TEMPLATE_SID } = process.env;

// Send message through Twilio WhatsApp
async function sendTwilioMessage({ from, to, body, contentSid }) {
  const auth = {
    username: TWILIO_ACCOUNT_SID,
    password: TWILIO_AUTH_TOKEN,
  };

  const payload = {
    From: from,
    To: to,
  };

  if (contentSid) {
    // Send Flow template (interactive HSM)
    payload.ContentSid = contentSid;
  } else {
    // Normal text
    payload.Body = body;
  }

  const url = `${TWILIO_BASE_URL}/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  await axios.post(url, new URLSearchParams(payload), { auth });
}

// ----------------------------
// Webhook Route
// ----------------------------
router.post("/", async (req, res) => {
  try {
    const incoming = req.body;
    const from = incoming.From?.replace("whatsapp:", "") || "";
    const to = incoming.To?.replace("whatsapp:", "") || "";
    const text = incoming.Body?.trim().toLowerCase() || "";

    // Match which business this number belongs to
    const business =
      (await Business.findOne({ "wa.number": to })) ||
      (await Business.findOne({ whatsappNumber: to }));

    if (!business) {
      console.log("❌ Business not found for number", to);
      return res.sendStatus(200);
    }

    // Detect if user wants to start a booking flow
    const bookingKeywords = ["book", "احجز", "הזמנה", "حجز", "appointment", "reserve"];
    const wantsBooking = bookingKeywords.some((k) => text.includes(k));

    if (wantsBooking && business.businessType === "booking" || business.businessType === "mixed") {
      console.log(`🚀 Launching booking flow for ${business.nameEnglish}`);

      await sendTwilioMessage({
        from: `whatsapp:${business.wa.number}`,
        to: `whatsapp:${from}`,
        contentSid: TWILIO_FLOW_TEMPLATE_SID,
      });

      return res.status(200).json({ success: true, message: "Flow launched" });
    }

    // fallback: simple text reply
    await sendTwilioMessage({
      from: `whatsapp:${business.wa.number}`,
      to: `whatsapp:${from}`,
      body: `👋 Hello from ${business.nameEnglish}!\nType *book* to start booking your appointment.`,
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("Twilio webhook error:", err.message);
    res.sendStatus(500);
  }
});

module.exports = router;