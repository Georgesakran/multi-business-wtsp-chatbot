const twilio = require('twilio');

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ✅ إرسال قائمة اختيار تفاعلية (List Picker)
async function sendListPicker(to, business, { header, body, buttonText, rows }) {
  try {
    // تحقق من التنسيق الصحيح للقائمة
    if (!rows || rows.length === 0) {
      throw new Error('❌ لا توجد عناصر لإرسالها في القائمة');
    }

    await twilioClient.messages.create({
      from: `whatsapp:${business.whatsappNumber}`,
      to: `whatsapp:${to}`,
      body: '⬇️ يرجى الاختيار من القائمة التالية:',
      interactive: {
        type: 'list',
        header: {
          type: 'text',
          text: header
        },
        body: {
          text: body
        },
        footer: {
          text: '' // يمكنك إضافة ملاحظة هنا
        },
        action: {
          button: buttonText,
          sections: [{
            title: header,
            rows: rows // يجب أن تكون مصفوفة من العناصر: [{ id, title, description }]
          }]
        }
      }
    });

    console.log('📤 تم إرسال القائمة التفاعلية إلى', to);
  } catch (err) {
    console.error('❌ sendListPicker error:', err.message);
  }
}

module.exports = { sendListPicker };