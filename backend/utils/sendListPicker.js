const twilio = require('twilio');
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendListPicker(to, business, { header, body, buttonText, rows }) {
  try {
    if (!rows || rows.length === 0) {
      throw new Error('❌ لا توجد صفوف لإرسالها.');
    }

    await twilioClient.messages.create({
      from: `whatsapp:${business.whatsappNumber}`,
      to: `whatsapp:${to}`,
      contentSid: undefined,
      persistentAction: [],
      interactive: {
        type: "list",
        body: { text: body },
        action: {
          button: buttonText,
          sections: [
            {
              title: header,
              rows: rows
            }
          ]
        }
      }
    });

    console.log("📤 قائمة مرسلة بنجاح إلى", to);
  } catch (err) {
    console.error('❌ sendListPicker error:', err.message);
  }
}

module.exports = { sendListPicker };