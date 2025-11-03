// utils/sendTwilio.js
const axios = require("axios");
const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
const TWILIO_BASE_URL = "https://api.twilio.com/2010-04-01";

async function sendWhatsApp({ from, to, body }) {
  const auth = { username: TWILIO_ACCOUNT_SID, password: TWILIO_AUTH_TOKEN };
  const url = `${TWILIO_BASE_URL}/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const payload = new URLSearchParams({ From: `whatsapp:${from}`, To: `whatsapp:${to}`, Body: body });
  await axios.post(url, payload, { auth });
}

module.exports = { sendWhatsApp };