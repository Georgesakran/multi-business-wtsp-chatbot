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
const handleChatbotEntryPoint = require('./chatbot/handleChatbotEntryPoint');

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

  // inside your webhook POST logic:
  await handleChatbotEntryPoint(text, business);

});






app.listen(process.env.PORT, () => console.log('✅ Server ready on http://localhost:' + process.env.PORT));
