const twilio = require('twilio');
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// 📤 Send a dynamic List Picker
async function sendListPicker(to, business, { header, body, buttonText, rows }) {
  try {
    const interactive = {
      type: 'list',
      body: { text: body },
      action: {
        button: buttonText,
        sections: [{
          title: header,
          rows
        }]
      }
    };

    await twilioClient.messages.create({
      from: `whatsapp:${business.whatsappNumber}`,
      to: `whatsapp:${to}`,
      interactive
    });

    console.log('📤 List Picker sent to', to);
  } catch (err) {
    console.error('❌ sendListPicker error:', err.message);
  }
}

module.exports = { sendListPicker };