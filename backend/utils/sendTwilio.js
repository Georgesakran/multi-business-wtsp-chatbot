const axios = require("axios");

const { TWILIO_SID, TWILIO_AUTH, TWILIO_WA_FROM } = process.env; // you already have these

const twilio = axios.create({
  baseURL: "https://api.twilio.com/2010-04-01",
  auth: { username: TWILIO_SID, password: TWILIO_AUTH },
  headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" }
});

function toForm(params) {
  return new URLSearchParams(params).toString();
}

/**
 * Supports:
 *  - Plain text: { from, to, body }
 *  - Content template: { from, to, contentSid, variables }  // variables is a JS object
 */
async function sendWhatsApp({ from, to, body, contentSid, variables }) {
  const payload = { From: `whatsapp:${from}`, To: `whatsapp:${to}` };

  if (contentSid) {
    payload.ContentSid = contentSid;
    if (variables) payload.ContentVariables = JSON.stringify(variables);
  } else {
    payload.Body = body;
  }

  await twilio.post(`/Accounts/${TWILIO_SID}/Messages.json`, toForm(payload));
}

module.exports = { sendWhatsApp };