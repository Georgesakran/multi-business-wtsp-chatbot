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
const verifyMetaSignature = require('./utils/verifyMetaSignature');
const availabilityRoutes = require('./routes/availabilityRoutes');

const waFlowsRoutes = require("./routes/waFlowRoutes");
const { handleFlowIncoming } = require("./utils/waFlow");
const verifyTwilioSignature = require("./utils/verifyTwilioSignature");
const { sendWhatsApp } = require("./utils/sendTwilio");
const ConversationState = require('./models/ConversationState');


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
  app.use("/api/wa", waFlowsRoutes);

  





app.get('/webhook', async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (!mode || !token) return res.sendStatus(403);
  const business = await Business.findOne({ verifyToken: token });

  if (mode === 'subscribe' && business) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

app.post("/webhook/twilio", verifyTwilioSignature, async (req, res) => {
  try {
    const fromRaw = req.body.From;  // "whatsapp:+9725..."
    const toRaw   = req.body.To;    // "whatsapp:+972..."
    const body    = (req.body.Body || "").trim();

    const from = fromRaw?.replace("whatsapp:", "");
    const to   = toRaw?.replace("whatsapp:", "");

    const business = await Business.findOne({ "wa.number": to, isActive: true });
    if (!business) {
      console.log("No business matched To:", to);
      return res.sendStatus(200);
    }

    // log inbound
    await Message.create({
      businessId: business._id,
      customerId: from,
      role: "user",
      content: body
    });

    // run flow logic
    const reply = await handleFlowIncoming({ business, from, text: body });

    // send reply
    await sendWhatsApp({
      from: business.wa?.number || process.env.TWILIO_WHATSAPP_FROM,
      to: from,
      body: reply
    });

    // log outbound
    await Message.create({
      businessId: business._id,
      customerId: from,
      role: "assistant",
      content: reply
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});



app.listen(process.env.PORT, () => console.log('✅ Server ready on http://localhost:' + process.env.PORT));
