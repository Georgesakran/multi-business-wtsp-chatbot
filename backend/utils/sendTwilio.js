const twilio = require("twilio");
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Send a WhatsApp message from the business's own number.
 * @param {string} toE164 - E.164 phone number of the customer, e.g. +9725...
 * @param {string} body - message text
 * @param {string} fromE164 - E.164 WhatsApp-enabled Twilio number of the BUSINESS (e.g. +972525561686)
 */
async function sendWhatsApp(toE164, body, fromE164) {
  const to = toE164.startsWith("whatsapp:") ? toE164 : `whatsapp:${toE164}`;

  // Fallback to env only if per-business number is not provided
  const defaultFrom = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";
  const from =
    fromE164
      ? (fromE164.startsWith("whatsapp:") ? fromE164 : `whatsapp:${fromE164}`)
      : defaultFrom;

  return client.messages.create({ from, to, body });
}

module.exports = { sendWhatsApp };