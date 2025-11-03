// utils/sendTwilio.js
const axios = require("axios");

const TWILIO_BASE_URL = "https://api.twilio.com/2010-04-01";
const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;

function asWa(num) {
  if (!num) return num;
  return num.startsWith("whatsapp:") ? num : `whatsapp:${num}`;
}

exports.sendWhatsApp = async ({ from, to, body, contentSid, mediaUrl }) => {
  const auth = {
    username: TWILIO_ACCOUNT_SID,
    password: TWILIO_AUTH_TOKEN,
  };

  const payload = {
    From: asWa(from),   // <-- normalize here
    To: asWa(to),       // <-- normalize here
  };

  if (contentSid) payload.ContentSid = contentSid;
  if (body)       payload.Body = body;
  if (mediaUrl)   payload.MediaUrl = mediaUrl;

  const url = `${TWILIO_BASE_URL}/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  // Optional debug
  // console.log("Twilio payload", payload);

  await axios.post(url, new URLSearchParams(payload), { auth });
};