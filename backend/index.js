const express = require('express');
require('dotenv').config();
const cors = require('cors');
const connectToMongo = require('./db');
const Business = require('./models/Business');
const ConversationState = require('./models/ConversationState');
const { sendMessage, sendMainMenu, sendServiceMenuTemplate} = require('./utils/sendMessage');
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
      await sendMainMenu(from, business); // ← أو sendListPicker لو تحب تبدأ بها
      return res.sendStatus(204);
    }

    if (payload === 'booking_option') {
      state.mode = 'booking';
      state.step = 'selectService';
      state.data = {};
      await state.save();
      await sendServiceMenuTemplate(from, business);


      const services = business.services || [];
      const rows = services.map((s, i) => ({
        id: `service_${i}`,
        title: s.name,
        description: `${s.price}₪`
      }));

      console.log('📦 Payload:', payload);
      
      return res.sendStatus(204);
    }
    return res.sendStatus(204);
  } catch (err) {
    console.error('❌ Webhook error:', err);
    return res.sendStatus(500);
  }
});






app.listen(process.env.PORT, () => console.log('✅ Server ready on http://localhost:' + process.env.PORT));
