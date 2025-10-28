const express = require('express');
require('dotenv').config();
const cors = require('cors');
const connectToMongo = require('./db');
const Message = require('./models/Message');
const Business = require('./models/Business');
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
const availabilityRoutes = require('./routes/availabilityRoutes');

const waFlowsRoutes = require("./routes/waFlowRoutes");
const { handleFlowIncoming } = require("./utils/waFlow");
const verifyMetaSignature = require('./utils/verifyMetaSignature');
const verifyTwilioSignature = require("./utils/verifyTwilioSignature");
const { sendWhatsApp } = require("./utils/sendTwilio");
const ConversationState = require('./models/ConversationState');
const twilioWebhook = require("./routes/twilioWebhook");


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
  
  app.use("/api/wa/flows", waFlowsRoutes);
  app.use("/webhook/twilio", twilioWebhook);
  





app.get('/webhook', async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (!mode || !token) return res.sendStatus(403);
  const business = await Business.findOne({ verifyToken: token });

  if (mode === 'subscribe' && business) return res.status(200).send(challenge);
  return res.sendStatus(403);
});





app.listen(process.env.PORT, () => console.log('✅ Server ready on http://localhost:' + process.env.PORT));
