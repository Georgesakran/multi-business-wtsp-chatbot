const twilio = require("twilio");

module.exports = function verifyTwilioSignature(req, res, next) {
  try {
    const sig = req.get("X-Twilio-Signature");
    if (!sig) return res.status(401).send("Missing Twilio signature");

    const base = String(process.env.PUBLIC_WEBHOOK_URL || "").replace(/\/$/, "");
    const url = base + req.originalUrl;
    const params = req.body || {};

    const valid = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      sig,
      url,
      params
    );

    if (!valid) return res.status(403).send("Invalid Twilio signature");
    next();
  } catch (err) {
    console.error("Signature verification error:", err);
    res.status(500).send("Signature verification error");
  }
};