// utils/sendTwilio.js
const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// helper – מוסיף prefix של whatsapp: אם חסר
function ensureWhatsAppAddress(num) {
  if (!num) return num;
  const s = String(num).trim();
  if (s.startsWith("whatsapp:")) return s;
  return `whatsapp:${s}`;
}

// שליחת הודעה רגילה
async function sendWhatsApp({ from, to, body, mediaUrl, messagingServiceSid }) {
  const payload = {
    from: ensureWhatsAppAddress(
      from || process.env.TWILIO_WHATSAPP_NUMBER // fallback כללי
    ),
    to: ensureWhatsAppAddress(to),
    body: body || "",
  };

  // תמונות / מדיה
  if (mediaUrl) {
    payload.mediaUrl = Array.isArray(mediaUrl) ? mediaUrl : [mediaUrl];
  }

  if (messagingServiceSid) {
    payload.messagingServiceSid = messagingServiceSid;
  }

  return client.messages.create(payload);
}

// אם אתה עובד גם עם Content Template דרך Twilio (sendTemplate)
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
    contentVariables: JSON.stringify(variables || {}),
  };

  if (messagingServiceSid) {
    payload.messagingServiceSid = messagingServiceSid;
  }

  return client.messages.create(payload);
}

module.exports = {
  sendWhatsApp,
  sendTemplate,
};