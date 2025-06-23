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

const axios = require('axios');

async function sendMenu(to, business) {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${business.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
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
      },
      {
        headers: {
          Authorization: `Bearer ${business.whatsappToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ WhatsApp interactive menu sent to', to);
  } catch (error) {
    console.error('❌ Failed to send interactive menu:', error.message);
  }
}

module.exports = { sendMenu };


module.exports = { sendMessage };
