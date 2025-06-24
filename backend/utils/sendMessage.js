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
// — Send interactive menu with button for services

const serviceTemplateMap = {
  1: 'HXa3116036f7c52753ffc913da2b979604', // قالب فيه 1 خدمات
  2: 'HX513cff1a3f706be3f7be641848f9c39a', // قالب فيه 2 خدمات
  3: 'HX9c0a06261ed62e2d6a9c3de520da3815', // قالب فيه 3 خدمات
  4: 'HX7a5405b85a203f3d559ccc471278ebd6', // قالب فيه 4 خدمات
};

async function sendServiceMenuTemplate(to, business) {
  try {
    const services = business.services.slice(0, 10); // Max 10
    const contentVariables = {};

    services.forEach((service, i) => {
      const index = i * 3;
      contentVariables[(index + 1).toString()] = service.name || 'خدمة';
      contentVariables[(index + 2).toString()] = `service_${i}`;
      contentVariables[(index + 3).toString()] = `${service.price}₪`;
    });

    const sid = serviceTemplateMap[services.length];
    if (!sid) throw new Error(`No template configured for ${services.length} services`);

    await twilioClient.messages.create({
      from: `whatsapp:${business.whatsappNumber}`,
      to: `whatsapp:${to}`,
      contentSid: sid,
      contentVariables: JSON.stringify(contentVariables),
    });

    console.log('✅ تم إرسال قائمة الخدمات بنجاح');
  } catch (err) {
    console.error('❌ فشل في إرسال قائمة الخدمات:', err.message);
  }
}

module.exports = { sendMessage, sendMainMenu, sendServiceMenuTemplate };
