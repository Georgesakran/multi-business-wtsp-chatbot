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

// ✅ Send WhatsApp Menu with Interactive Buttons
async function sendMenu(to, business) {
  try {
    await twilioClient.messages.create({
      from: `whatsapp:${business.whatsappNumber}`,
      to: `whatsapp:${to}`,
      interactive: {
        type: 'button',
        body: {
          text: 'Please choose an option:'
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: 'booking_option',
                title: '📅 Booking'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'location_option',
                title: '📍 Location'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'info_option',
                title: 'ℹ️ Information'
              }
            }
          ]
        }
      }
    });
    console.log('📤 Menu sent via Twilio to', to);
  } catch (error) {
    console.error('❌ Failed to send menu via Twilio:', error.message);
  }
}

module.exports = { sendMessage, sendMenu };
