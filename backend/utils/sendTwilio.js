// utils/sendTwilio.js
const twilio = require("twilio");
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendWhatsApp({ from, to, body }) {
  const _from = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;
  const _to   = to.startsWith("whatsapp:") ? to   : `whatsapp:${to}`;
  return client.messages.create({ from: _from, to: _to, body });
}

module.exports = { sendWhatsApp };