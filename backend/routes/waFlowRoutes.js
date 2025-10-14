// routes/waFlowsRoutes.js
const express = require("express");
const router = express.Router();
const Business = require("../models/Business");
const { sendWhatsApp } = require("../utils/sendTwilio");
const { handleFlowIncoming } = require("../utils/waFlow");




// --- Health check (Flow Builder calls this) ---
router.get("/booking/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// --- Data exchange endpoint (Flow sends user actions here) ---
router.post("/booking", async (req, res) => {
  try {
    // Flow sends a JSON body that includes the action payload
    // Example shape (varies slightly): { action: { payload: { trigger, ... } }, data: {...} }
    const action = req.body?.action || {};
    const payload = action.payload || {};
    const trigger = payload.trigger || "";

    // You can use these to scope by business and drive dynamic data
    const businessId = payload.businessId;

    // Default response object (Flow expects JSON back)
    // You return ONLY the fields your screens bind to (services/dates/times/labels/etc)
    let responseData = {};

    switch (trigger) {
      case "service_selected": {
        // user picked a service; load dates for the next 10 working days
        // TODO: replace with your real helper that reads business config + closed dates
        responseData = {
          dates: [
            { id: "2025-10-15", title: "Wed, 15/10 (2025-10-15)" },
            { id: "2025-10-16", title: "Thu, 16/10 (2025-10-16)" },
            { id: "2025-10-17", title: "Fri, 17/10 (2025-10-17)" }
          ]
        };
        break;
      }

      case "date_selected": {
        // user picked a date; compute available times for that date + service
        // TODO: replace with real availability calculation
        responseData = {
          times: [
            { id: "09:00", title: "09:00" },
            { id: "09:30", title: "09:30" },
            { id: "10:00", title: "10:00" }
          ]
        };
        break;
      }

      case "confirm_booking": {
        // user clicked confirm in the last screen
        // Create a booking in your DB here, then return nothing special
        // (Flow will just close after your 200 OK)
        // await Bookings.create({...});
        responseData = { ok: true };
        break;
      }

      default: {
        // Initial request OR unknown trigger → send initial lists (services)
        // TODO: load active services for this business from DB
        responseData = {
          services: [
            { id: "6864175843557f7d8c0fdd49", title: "Basic Manicure - 70 (30m)" },
            { id: "6864175843557f7d8c0fdd4a", title: "Gel Polish - 120 (45m)" },
            { id: "6864175843557f7d8c0fdd4b", title: "Nail Art Design - 150 (60m)" }
          ]
        };
      }
    }

    // The Flow Data API expects a 200 with JSON payload of the fields you bind in the JSON.
    // No special wrapper is required beyond a top-level JSON object.
    return res.status(200).json(responseData);
  } catch (err) {
    console.error("Flow booking endpoint error:", err);
    return res.status(200).json({}); // Return empty object so Flow UI doesn’t break
  }
});

module.exports = router;


// POST /api/wa/send-menu  { to:"+9725...", bizId:"..." }
router.post("/send-menu", async (req, res) => {
  try {
    const { to, bizId } = req.body;
    const biz = await Business.findById(bizId);
    if (!biz) return res.status(404).json({ error: "Business not found" });

    const body = [
      "👋 Hi!",
      "Reply with:",
      mainMenuText(biz)
    ].join("\n");

    await sendWhatsApp({ from: biz.wa?.number || process.env.TWILIO_WHATSAPP_FROM, to, body });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed" });
  }
});

// (Optionally expose a dry-run handler)
router.post("/dry-handle", async (req, res) => {
  const { to, text, bizId } = req.body;
  const biz = await Business.findById(bizId);
  if (!biz) return res.status(404).json({ error: "Business not found" });
  const reply = await handleFlowIncoming({ business: biz, from: to, text });
  res.json({ reply });
});

// tiny local helper so this file compiles standalone
function mainMenuText(biz) {
  const name = biz.nameEnglish || biz.nameArabic || biz.nameHebrew || "Our salon";
  return [
    `👋 Welcome to ${name}!`,
    "",
    "1) Book a service",
    "2) Order a product",
    "3) FAQs",
    "0) Talk to a human",
  ].join("\n");
}

module.exports = router;