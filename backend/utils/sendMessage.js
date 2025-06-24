const twilio = require('twilio');
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);


const mainTemplateSid='HX3714f88bdd47fa8833ac43edf3636396';
const dayTemplateSid='HX5027e5f4256d6760f0c0a931b3f6f8cc';
const serviceTemplateMap = {
  1: 'HXa3116036f7c52753ffc913da2b979604', // قالب فيه 1 خدمات
  2: 'HX513cff1a3f706be3f7be641848f9c39a', // قالب فيه 2 خدمات
  3: 'HX9c0a06261ed62e2d6a9c3de520da3815', // قالب فيه 3 خدمات
  4: 'HX7a5405b85a203f3d559ccc471278ebd6', // قالب فيه 4 خدمات
  5: 'HX1952c83192bd8138f0189fed833023f7', // قالب فيه5 خدمات
  6: 'HX9106d50ccf62dbe2e3f64b81f0018420', // قالب فيه 6 خدمات
  7: 'HXcb06f460adf77423407552d17c165920', // قالب فيه 7 خدمات
  8: 'HX8b65aeebd13ec518f9a2b830cf5a7e6f', // قالب فيه 8 خدمات
  9: 'HXd52aeb3493993a4585063880aa933452', // قالب فيه 9 خدمات
  10: 'HX327b97ee0b49caef985b410998523c13', // قالب فيه 10 خدمات
};

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
        contentSid: mainTemplateSid,
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

// — Send day picker template with next 7 days

async function sendDayPickerTemplate(to, business) {
  try {
    const contentVariables = {};
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const label = date.toLocaleDateString('ar-EG', {
        weekday: 'long',
        day: 'numeric',
        month: 'numeric'
      });

      const baseIndex = i * 3;
      contentVariables[(baseIndex + 1).toString()] = label;       // {{1}}, {{4}}, ...
      contentVariables[(baseIndex + 2).toString()] = `day_${i}`;  // {{2}}, {{5}}, ...
      contentVariables[(baseIndex + 3).toString()] = ' ';         // {{3}}, {{6}}, ... (أو اكتب مثلاً "متاح بين 9:00 - 17:00")
    }

    // أكمل باقي المتغيرات إلى 30 بـ "-"
    for (let i = 7 * 3 + 1; i <= 30; i++) {
      contentVariables[i.toString()] = '-';
    }

    await twilioClient.messages.create({
      from: `whatsapp:${business.whatsappNumber}`,
      to: `whatsapp:${to}`,
      contentSid: dayTemplateSid,
      contentVariables: JSON.stringify(contentVariables),
    });

    console.log('✅ تم إرسال قالب اختيار اليوم بنجاح');
  } catch (err) {
    console.error('❌ فشل في إرسال قالب اختيار اليوم:', err.message);
  }
}

module.exports = { sendMessage, sendMainMenu, sendServiceMenuTemplate , sendDayPickerTemplate};
