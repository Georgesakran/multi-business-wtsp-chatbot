// 📂 utils/sendMessage.js
const twilio = require('twilio');

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendMessage(to, text, business) {
  try {
    if (business.whatsappType === 'twilio') {
      await twilioClient.messages.create({
        from: `whatsapp:${business.whatsappNumber}`,
        to: `whatsapp:${to}`,
        body: text,
      });
      console.log('📤 Twilio message sent to', to);
    } else {
      console.warn('⚠️ Business is not using Twilio for WhatsApp');
    }
  } catch (error) {
    console.error('❌ Failed to send via Twilio:', error.message);
  }
}

module.exports = { sendMessage };
