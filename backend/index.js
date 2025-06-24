const express = require('express');
require('dotenv').config();
const cors = require('cors');
const connectToMongo = require('./db');
const Business = require('./models/Business');
const ConversationState = require('./models/ConversationState');
const { sendMessage, sendMenu } = require('./utils/sendMessage');
const { getReply } = require('./utils/getReply');
const { sendListPicker } = require('./utils/sendListPicker');
const handleBookingFlow = require('./bookingFlow/handleBookingFlow');
const authRoutes = require("./routes/authRoutes");
const businessRoutes = require("./routes/businessRoutes");
const adminRoutes = require("./routes/adminRoutes");
const bookingsRoutes = require("./routes/bookingsRoutes");
const app = express();

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://sakranagency-ai.com',
    'https://www.sakranagency-ai.com'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

  // ✅ Now connect to DB
  connectToMongo();

  // ✅ Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/businesses", businessRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/bookings", bookingsRoutes);

app.get('/webhook', async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (!mode || !token) return res.sendStatus(403);
  const business = await Business.findOne({ verifyToken: token });

  if (mode === 'subscribe' && business) return res.status(200).send(challenge);
  return res.sendStatus(403);
});




app.post("/webhook", async (req, res) => {
  console.log('📥 Webhook received:', JSON.stringify(req.body, null, 2));
  const getNext7Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayLabel = date.toLocaleDateString('ar-EG', {
        weekday: 'long',
        day: 'numeric',
        month: 'numeric'
      });
      days.push({
        label: dayLabel,
        value: date.toISOString().split('T')[0]
      });
    }
    return days;
  };
  const getAvailableHours = (date, business) => {
    // Static example – ideally pull from business config
    return ['09:00', '10:00', '11:00', '12:00', '15:00', '17:00'];
  };
  try {
    const isTwilio = !!req.body.Body && !!req.body.From;
    let from, to, text, business, payload;

    if (isTwilio) {
      from = req.body.From.replace('whatsapp:', '');
      to = req.body.To.replace('whatsapp:', '');
      text = req.body.Body?.trim();
      payload = req.body.ListPickerResponseId || req.body.ButtonPayload || text;
      business = await Business.findOne({ whatsappNumber: to });
    }

    if (!from || !business) return res.sendStatus(204);

    let state = await ConversationState.findOne({ businessId: business._id, phoneNumber: from });

    if (!state) {
      state = await ConversationState.create({
        businessId: business._id,
        phoneNumber: from,
        step: 'menu',
        mode: 'gpt',
        data: {}
      });
      await sendMessage(from, "👋 مرحبًا! اكتب 'menu' للخيارات.", business);
      return res.sendStatus(204);
    }
    if (text.toLowerCase() === 'menu') {
      await sendMenu(from, business); // ← أو sendListPicker لو تحب تبدأ بها
      return res.sendStatus(200);
    }

    if (payload === 'booking_option') {
      state.mode = 'booking';
      state.step = 'selectService';
      state.data = {};
      await state.save();

      const services = business.services || [];
      const rows = services.map((s, i) => ({
        id: `service_${i}`,
        title: s.name,
        description: `${s.price}₪`
      }));

      await sendListPicker('972587400656', business, {
        header: 'اختر الخدمة',
        body: 'يرجى اختيار الخدمة التي تريد حجزها:',
        buttonText: 'الخدمات المتاحة',
        rows:[
          { id: '1', title: 'خدمة 1', description: 'وصف الخدمة 50 ILS' },
          { id: '2', title: 'خدمة 2', description: 'وصف الخدمة 100ILS' },
          { id: '3', title: 'خدمة 3', description: 'وصف الخدمة 3' }
        ]
      });
      return res.sendStatus(204);
    }

    if (state.mode === 'booking' && state.step === 'selectService' && payload.startsWith('service_')) {
      const index = parseInt(payload.replace('service_', ''));
      const selectedService = business.services[index];
      state.step = 'selectDay';
      state.data.service = selectedService;
      await state.save();

      const days = getNext7Days();
      const rows = days.map(day => ({
        id: `day_${day.value}`,
        title: day.label,
        description: ''
      }));

      await sendListPicker(from, business, {
        header: 'اختر اليوم',
        body: `الخدمة: ${selectedService.name}
اختر اليوم:`,
        buttonText: 'اختر يوم',
        rows
      });
      return res.sendStatus(204);
    }

    if (state.mode === 'booking' && state.step === 'selectDay' && payload.startsWith('day_')) {
      const date = payload.replace('day_', '');
      state.step = 'selectHour';
      state.data.selectedDate = date;
      await state.save();

      const hours = getAvailableHours(date, business);
      const rows = hours.map(h => ({
        id: `hour_${h}`,
        title: h,
        description: ''
      }));

      await sendListPicker(from, business, {
        header: 'اختر الساعة',
        body: `اليوم: ${date}`,
        buttonText: 'اختر ساعة',
        rows
      });
      return res.sendStatus(204);
    }

    if (state.mode === 'booking' && state.step === 'selectHour' && payload.startsWith('hour_')) {
      const hour = payload.replace('hour_', '');
      const { selectedDate, service } = state.data;

      const exists = await Booking.findOne({ businessId: business._id, date: selectedDate, hour });
      if (exists) {
        await sendMessage(from, '❌ هذا الموعد محجوز مسبقًا. اختر وقتًا آخر.', business);
        return res.sendStatus(204);
      }

      await Booking.create({
        businessId: business._id,
        phoneNumber: from,
        date: selectedDate,
        hour,
        service: service.name
      });

      await sendMessage(from, `🎉 تم تأكيد حجزك!
      الخدمة: ${service.name}
      📅 التاريخ: ${selectedDate}
      ⏰ الساعة: ${hour}`, business);

      state.mode = 'gpt';
      state.step = 'menu';
      state.data = {};
      await state.save();

      return res.sendStatus(204);
    }

    return res.sendStatus(204);
  } catch (err) {
    console.error('❌ Webhook error:', err);
    return res.sendStatus(500);
  }
});






app.listen(process.env.PORT, () => console.log('✅ Server ready on http://localhost:' + process.env.PORT));
