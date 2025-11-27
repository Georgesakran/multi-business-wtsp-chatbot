const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// add whatsapp: prefix if missing
function ensureWhatsAppAddress(num) {
  if (!num) return num;
  const s = String(num).trim();
  if (s.startsWith("whatsapp:")) return s;
  return `whatsapp:${s}`;
}


// ---------------------
// SEND NORMAL MESSAGE
// ---------------------
async function sendWhatsApp({ from, to, body, mediaUrl, messagingServiceSid }) {
  const payload = {
    from: ensureWhatsAppAddress(
      from || process.env.TWILIO_WHATSAPP_NUMBER
    ),
    to: ensureWhatsAppAddress(to),
    body: body || "",
  };

  if (mediaUrl) {
    payload.mediaUrl = Array.isArray(mediaUrl) ? mediaUrl : [mediaUrl];
  }

  if (messagingServiceSid) {
    payload.messagingServiceSid = messagingServiceSid;
  }

  return client.messages.create(payload);
}


// ---------------------
// SEND TEMPLATE MESSAGE
// ---------------------
async function sendTemplate({
  from,
  to,
  contentSid,
  variables = {},
  messagingServiceSid,
}) {
  const payload = {
    from: ensureWhatsAppAddress(
      from || process.env.TWILIO_WHATSAPP_NUMBER
    ),
    to: ensureWhatsAppAddress(to),
    contentSid,
    contentVariables: JSON.stringify(variables),
  };

  if (messagingServiceSid) {
    payload.messagingServiceSid = messagingServiceSid;
  }

  return client.messages.create(payload);
}


// ---------------------
// EXPORT BOTH FUNCTIONS
// ---------------------
module.exports = {
  sendWhatsApp,
  sendTemplate,
};
