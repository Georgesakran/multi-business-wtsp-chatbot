const toE164 = (x) => String(x || "").replace(/^whatsapp:/, "");

module.exports = { toE164 };