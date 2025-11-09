// utils/sendTwilio.js
const twilio = require("twilio");
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Plain text WhatsApp
 */
async function sendWhatsApp({ from, to, body, messagingServiceSid }) {
  const payload = {
    to: `whatsapp:${to}`,
    body,
  };
  if (messagingServiceSid) payload.messagingServiceSid = messagingServiceSid;
  else payload.from = `whatsapp:${from}`;

  return client.messages.create(payload);
}

/**
 * Twilio Content Template (approved “Content SID”)
 * variables: { "{{name}}" : "Dina" }  OR  { name: "Dina" } – both accepted
 */
async function sendTemplate({ from, to, contentSid, variables = {}, messagingServiceSid }) {
  // Twilio allows variables either as flat map or as contentVariables JSON string
  const payload = {
    to: `whatsapp:${to}`,
    contentSid,
    contentVariables: JSON.stringify(variables || {}),
  };
  if (messagingServiceSid) payload.messagingServiceSid = messagingServiceSid;
  else payload.from = `whatsapp:${from}`;

  return client.messages.create(payload);
}

module.exports = { sendWhatsApp, sendTemplate };