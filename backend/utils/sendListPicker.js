const twilio = require('twilio');
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// 📤 General-purpose List Picker sender
async function sendListPicker(to, business, { header, body, buttonText, rows }) {
  try {
    await twilioClient.messages.create({
      from: `whatsapp:${business.whatsappNumber}`,
      to: `whatsapp:${to}`,
      contentSid: business.bookingListTemplateSid, // optional: dynamic contentSid from DB
      contentVariables: JSON.stringify({
        "1": header,
        "2": body,
        "3": buttonText,
        "4": rows
      })
    });
  } catch (err) {
    console.error('❌ sendListPicker error:', err.message);
  }
}

module.exports = { sendListPicker };



// 📂 routes/webhook.js (or in your main server file)

