const axios = require("axios");

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN
} = process.env;

const twilioHttp = axios.create({
  baseURL: `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}`,
  auth: { username: TWILIO_ACCOUNT_SID, password: TWILIO_AUTH_TOKEN }
});

// Plain WhatsApp text
async function sendText({ from, to, body, messagingServiceSid }) {
  const params = new URLSearchParams();
  if (messagingServiceSid) params.append("MessagingServiceSid", messagingServiceSid);
  else params.append("From", `whatsapp:${from}`);
  params.append("To", `whatsapp:${to}`);
  params.append("Body", body);

  const { data } = await twilioHttp.post("/Messages.json", params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" }
  });
  return data;
}

/**
 * Send a Twilio Content Template by SID (supports Quick Replies, Lists, etc.)
 *
 * @param {object} opts
 *  - from: sender E.164 (biz.wa.number)
 *  - to: recipient E.164
 *  - contentSid: HX... (Content Template SID)
 *  - contentVariables: object -> will be JSON stringified and passed as ContentVariables
 *  - messagingServiceSid: optional MG... (recommended)
 */
async function sendTemplate({ from, to, contentSid, contentVariables = {}, messagingServiceSid }) {
  const params = new URLSearchParams();
  if (messagingServiceSid) params.append("MessagingServiceSid", messagingServiceSid);
  else params.append("From", `whatsapp:${from}`);
  params.append("To", `whatsapp:${to}`);
  params.append("ContentSid", contentSid);

  // Twilio expects a JSON string for variables (if your template uses them)
  if (contentVariables && Object.keys(contentVariables).length) {
    params.append("ContentVariables", JSON.stringify(contentVariables));
  }

  const { data } = await twilioHttp.post("/Messages.json", params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" }
  });
  return data;
}

module.exports = { sendText, sendTemplate };