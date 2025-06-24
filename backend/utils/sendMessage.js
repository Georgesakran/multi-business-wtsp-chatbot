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

// — Send interactive menu with 3 options (bookings, location , info)
async function sendMainMenu(to, business) {
  try {
    if (business.whatsappType === 'twilio') {
      await twilioClient.messages.create({
        from: `whatsapp:${business.whatsappNumber}`,
        to: `whatsapp:${to}`,
        contentSid: 'HX3714f88bdd47fa8833ac43edf3636396',
        contentVariables: JSON.stringify({
          "1": "عزيزي العميل" // أو اسم الزبون لو عندك
        })
      });

      console.log('📤 تم إرسال قائمة الخيارات لـ', to);
    }
  } catch (err) {
    console.error('❌ sendMenu error:', err.message);
  }
}
// — Send interactive menu with buttonsuhgiuhiuhiuhiuhiuh

async function sendServiceMenuTemplate(to, business) {
  try {
    const services = business.services.slice(0, 10); // max 10 services
    const contentVariables = {};

    // Fill variables dynamically: 3 per service
    services.forEach((service, i) => {
      const index = i * 3;
      contentVariables[(index + 1).toString()] = service.name;
      contentVariables[(index + 2).toString()] = `service_${i}`; // or service._id
      contentVariables[(index + 3).toString()] = `${service.price}₪`;
    });

    await twilioClient.messages.create({
      from: `whatsapp:${business.whatsappNumber}`,
      to: `whatsapp:${to}`,
      contentSid: 'HX68f89e0768cf19045916ffd5c64dffc1', // your list template SID
      contentVariables: JSON.stringify(contentVariables),
    });

    console.log('✅ تم إرسال قائمة الخدمات بـ dynamic content');
  } catch (err) {
    console.error('❌ فشل في إرسال قائمة الخدمات:', err.message);
  }
}


module.exports = { sendMessage, sendMainMenu, sendServiceMenuTemplate };
