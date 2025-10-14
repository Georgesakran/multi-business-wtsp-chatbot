const express = require('express');
require('dotenv').config();
const cors = require('cors');
const connectToMongo = require('./db');
const Business = require('./models/Business');
const ConversationState = require('./models/ConversationState');
const { sendMessage,
        sendMainMenu, 
        sendServiceMenuTemplate, 
        sendDayPickerTemplate} = require('./utils/sendMessage');
const { getReply } = require('./utils/getReply');
const handleBookingFlow = require('./bookingFlow/handleBookingFlow');
const authRoutes = require("./routes/authRoutes");
const businessRoutes = require("./routes/businessRoutes");
const adminRoutes = require("./routes/adminRoutes");
const bookingsRoutes = require("./routes/bookingsRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const overviewRoutes = require("./routes/overviewRoutes");
const conversationRoutes = require("./routes/conversationsRoutes");
const clientsRoutes = require("./routes/clientsRoutes");
const courseRoutes = require("./routes/courseRoutes");
const productRoutes = require("./routes/productsRoutes");
const orderRoutes = require("./routes/orderRoutes");
const uploadRoutes = require("./routes/upload");
const verifyMetaSignature = require('./utils/verifyMetaSignature');
const availabilityRoutes = require('./routes/availabilityRoutes');

//const handleChatbotEntryPoint = require('./chatbot/handleChatbotEntryPoint');

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
  app.use("/api/services", serviceRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/overview", overviewRoutes);
  app.use("/api/conversations", conversationRoutes);
  app.use("/api/clients", clientsRoutes);
  app.use("/api/courses", courseRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/availability", availabilityRoutes);

  





app.get('/webhook', async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (!mode || !token) return res.sendStatus(403);
  const business = await Business.findOne({ verifyToken: token });

  if (mode === 'subscribe' && business) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

app.post('/webhook', verifyMetaSignature, async (req, res) => {
  try {
    // 1) Determine business by phone_number_id or recipient
    // 2) Persist WebhookEvent (direction: "in")
    // 3) Route to: handleBookingFlow(...) or getReply(...) based on ConversationState.mode/step
    // 4) Send response (200)
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});








app.listen(process.env.PORT, () => console.log('✅ Server ready on http://localhost:' + process.env.PORT));
