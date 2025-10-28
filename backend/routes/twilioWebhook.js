// routes/twilioWebhook.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const Business = require("../models/Business");

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FLOW_TEMPLATE_SID } = process.env;

async function sendTwilioMessage({ from, to, body, contentSid }) {
  const auth = {
    username: TWILIO_ACCOUNT_SID,
    password: TWILIO_AUTH_TOKEN,
  };

  const payload = {
    From: from,
    To: to,
  };

  if (contentSid) payload.ContentSid = contentSid;
  else payload.Body = body;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  await axios.post(url, new URLSearchParams(payload), { auth });
}

router.post("/", async (req, res) => {
  try {
    const incoming = req.body;
    const from = incoming.From?.replace("whatsapp:", "") || "";
    const to = incoming.To?.replace("whatsapp:", "") || "";
    const text = incoming.Body?.trim().toLowerCase() || "";

    // find business
    const business =
      (await Business.findOne({ "wa.number": to })) ||
      (await Business.findOne({ whatsappNumber: to }));

    if (!business) return res.sendStatus(200);

    // 1️⃣ Detect "book" keyword → send template
    const bookingKeywords = ["book", "احجز", "הזמנה", "حجز", "appointment", "reserve"];
    const wantsBooking = bookingKeywords.some(k => text.includes(k));

    if (wantsBooking && (business.businessType === "booking" || business.businessType === "mixed")) {
      console.log(`🚀 Launching booking flow for ${business.nameEnglish}`);
      await sendTwilioMessage({
        from: `whatsapp:${business.wa.number}`,
        to: `whatsapp:${from}`,
        contentSid: TWILIO_FLOW_TEMPLATE_SID,
      });
      return res.sendStatus(200);
    }

    // 2️⃣ If user replies after template → call your Flow endpoint manually
    const flowPayload = {
      from: business.wa.number, // your business number
      action: {
        stage: "user_reply",
        text: text,
        customerNumber: from,
      },
    };

    await axios.post(
        `${process.env.PUBLIC_WEBHOOK_URL}/api/wa/flows/booking`,
        flowPayload
      );
      

    res.sendStatus(200);
  } catch (err) {
    console.error("Twilio webhook error:", err.message);
    res.sendStatus(500);
  }
});

module.exports = router;
