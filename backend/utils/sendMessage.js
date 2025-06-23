const twilio = require('twilio');
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// — Send normal text message
async function sendMessage(to, text, business) {
  try {
    if (business.whatsappType === 'twilio') {
      await twilioClient.messages.create({
        from: `whatsapp:${business.whatsappNumber}`,
        to: `whatsapp:${to}`,
        body: text,
      });
      console.log('📤 Text message sent to', to);
    }
  } catch (err) {
    console.error('❌ sendMessage error:', err.message);
  }
}

// — Send interactive menu with buttons
async function sendMenu(to, business) {
  try {
    if (business.whatsappType === 'twilio') {
      await twilioClient.messages.create({
        from: `whatsapp:${business.whatsappNumber}`,
        to: `whatsapp:${to}`,
        interactive: {
          type: 'button',
          body: {
            text: 'Hello! How can I assist you today?'
          },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: { id: 'booking_option', title: '📅 Booking' }
              },
              {
                type: 'reply',
                reply: { id: 'location_option', title: '📍 Location' }
              },
              {
                type: 'reply',
                reply: { id: 'info_option', title: 'ℹ️ Info' }
              }
            ]
          }
        }
      });
      console.log('📤 Menu sent to', to);
    }
  } catch (err) {
    console.error('❌ sendMenu error:', err.message);
  }
}

module.exports = { sendMessage, sendMenu };
