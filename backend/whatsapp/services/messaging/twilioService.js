// services/messaging/twilioService.js
const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendWhatsApp({ from, to, body, mediaUrl }) {
  const msg = {
    from: `whatsapp:${from}`,
    to: `whatsapp:${to}`,
    body
  };

  if (mediaUrl) msg.mediaUrl = mediaUrl;

  return client.messages.create(msg);
}

async function sendTemplate({ from, to, contentSid, variables = {}, messagingServiceSid }) {
  return client.messages.create({
    from: `whatsapp:${from}`,
    to: `whatsapp:${to}`,
    contentSid,
    contentVariables: JSON.stringify(variables),
    ...(messagingServiceSid && { messagingServiceSid })
  });
}

module.exports = { sendWhatsApp, sendTemplate };