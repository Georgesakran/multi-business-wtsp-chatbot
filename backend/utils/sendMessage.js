const twilio = require('twilio');
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ✅ Send normal text message
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

// ✅ Send WhatsApp Menu with buttons
async function sendMenu(to, business) {
  try {
    if (business.whatsappType === 'twilio') {
      await twilioClient.messages.create({
        from: `whatsapp:${business.whatsappNumber}`,
        to: `whatsapp:${to}`,
        contentSid: process.env.TWILIO_MENU_SID, // Optional if you want to use predefined templates
        contentVariables: JSON.stringify({
          // Use these if using Twilio templates, otherwise remove
        }),
        body: 'Please choose an option:',
        persistentAction: [
          'reply?payload=booking_option&text=Book Now',
          'reply?payload=location_option&text=Location',
          'reply?payload=info_option&text=Information',
        ],
      });
      console.log('📤 Menu sent to', to);
    } else {
      console.warn('⚠️ Business is not using Twilio for WhatsApp');
    }
  } catch (error) {
    console.error('❌ Failed to send menu via Twilio:', error.message);
  }
}

module.exports = { sendMessage, sendMenu };
