const twilio = require("twilio");
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendWhatsApp(to, body) {
  const from = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";
  const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  return client.messages.create({ from, to: formattedTo, body });
}

module.exports = { sendWhatsApp };