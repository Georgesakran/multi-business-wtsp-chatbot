const express = require("express");
const router = express.Router();
const axios = require("axios");
const Business = require("../models/Business");

const TWILIO_BASE_URL = "https://api.twilio.com/2010-04-01";
const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FLOW_TEMPLATE_SID } = process.env;

/**
 * Send WhatsApp message via Twilio
 * Can send either plain text (body) or interactive Flow (contentSid)
 */
async function sendTwilioMessage({ from, to, body, contentSid }) {
  try {
    const auth = {
      username: TWILIO_ACCOUNT_SID,
      password: TWILIO_AUTH_TOKEN,
    };

    const payload = { From: from, To: to };
    if (contentSid) payload.ContentSid = contentSid;
    else payload.Body = body;

    const url = `${TWILIO_BASE_URL}/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    await axios.post(url, new URLSearchParams(payload), { auth });
  } catch (err) {
    console.error("❌ Failed to send Twilio message:", err.message);
  }
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

    // Match business by number
    const business =
      (await Business.findOne({ "wa.number": to })) ||
      (await Business.findOne({ whatsappNumber: to }));

    if (!business) {
      console.log("❌ Business not found for number:", to);
      return res.sendStatus(200); // 200 so Twilio won't retry
    }

    // Detect booking keywords
    const bookingKeywords = ["book", "احجز", "הזמנה", "حجز", "appointment", "reserve"];
    const wantsBooking = bookingKeywords.some(k => text.includes(k));

    if (wantsBooking && (business.businessType === "booking" || business.businessType === "mixed")) {
      console.log(`🚀 Launching booking flow for ${business.nameEnglish}`);

      await sendTwilioMessage({
        from: `whatsapp:${business.wa.number}`,
        to: `whatsapp:${from}`,
        contentSid: TWILIO_FLOW_TEMPLATE_SID || "HX044f74b9faf4141339dafb54d847b88b", // fallback
      });

      return res.status(200).json({ success: true, message: "Flow launched" });
    }

    // Fallback simple text
    console.log(`💬 Sending fallback text to ${from}`);
    await sendTwilioMessage({
      from: `whatsapp:${business.wa.number}`,
      to: `whatsapp:${from}`,
      body: `👋 Hello from ${business.nameEnglish}!\nType *book* to start booking your appointment.`,
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Twilio webhook error:", err.message);
    res.sendStatus(500);
  }
});

module.exports = router;
