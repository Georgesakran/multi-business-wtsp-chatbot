// routes/waFlowsRoutes.js
const express = require("express");
const router = express.Router();
const Business = require("../models/Business");
const { sendWhatsApp } = require("../utils/sendTwilio");
const { handleFlowIncoming } = require("../utils/waFlow");

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