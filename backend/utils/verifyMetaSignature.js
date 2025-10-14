// utils/verifyMetaSignature.js
// Simple no-op middleware until you add real signature validation

module.exports = (req, res, next) => {
    // TODO: later, verify Meta/WhatsApp HMAC SHA1 signature from
    // X-Hub-Signature-256 header against your APP_SECRET
    next();
  };