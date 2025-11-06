// utils/sendTwilio.js
const twilio = require("twilio");
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Simple WhatsApp text
async function sendWhatsApp({ from, to, body, messagingServiceSid }) {
  const payload = {
    to: `whatsapp:${to}`,
    body,
  };
  if (messagingServiceSid) payload.messagingServiceSid = messagingServiceSid;
  else payload.from = `whatsapp:${from}`;

  return client.messages.create(payload);
}

// Twilio Content Template (Content SID)
async function sendTemplate({ from, to, contentSid, variables = {}, messagingServiceSid }) {
  const contentVars = Object.entries(variables).map(([k, v]) => ({ key: k, value: String(v) }));

  const payload = {
    to: `whatsapp:${to}`,
    contentSid,
    contentVariables: JSON.stringify(contentVars.reduce((acc, x) => ({ ...acc, [x.key]: x.value }), {})),
  };

  if (messagingServiceSid) payload.messagingServiceSid = messagingServiceSid;
  else payload.from = `whatsapp:${from}`;

  // Twilio API for Content Templates:
  // https://www.twilio.com/docs/content-api/send
  return client.messages.create(payload);
}

module.exports = { sendWhatsApp, sendTemplate };