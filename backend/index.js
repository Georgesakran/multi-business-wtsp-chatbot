const express = require("express");
require("dotenv").config();
const cors = require("cors");
const connectToMongo = require("./db");

const Business = require("./models/Business");
const ConversationState = require('./models/ConversationState');
const handleBookingFlow = require('./bookingFlow/handleBookingFlow');

const { sendMessage } = require('./utils/sendMessage');
const { getReply } = require('./utils/getReply');

const app = express();

// CORS Middleware
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://multi-business-wtsp-chatbot.vercel.app",
    "https://multi-business-wtsp-chatbot-pvzn01btu-george-sakrans-projects.vercel.app",
    "https://sakranagency-ai.com",
    "https://www.sakranagency-ai.com"
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to DB
connectToMongo();

// Routes (your existing routes)
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/businesses", require("./routes/businessRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use('/api/bookings', require('./routes/bookingsRoutes'));

// Verify Webhook for Meta
app.get("/webhook", async (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (!mode || !token) return res.sendStatus(403);

  const business = await Business.findOne({ verifyToken: token });
  if (mode === "subscribe" && business) {
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});

// Handle incoming messages webhook
app.post("/webhook", async (req, res) => {
  try {
    const isTwilio = !!req.body.Body && !!req.body.From;

    let from, to, text, business;

    if (isTwilio) {
      from = req.body.From.replace("whatsapp:", "");
      to = req.body.To.replace("whatsapp:", "");
      text = req.body.Body.trim();

      business = await Business.findOne({ whatsappNumber: to });
      if (!business) {
        console.log("⚠️ Business not found for Twilio number");
        return res.sendStatus(200);
      }
    } else {
      // Add Meta WhatsApp handling if needed
      const value = req.body.entry?.[0]?.changes?.[0]?.value;
      const message = value?.messages?.[0];
      from = message?.from;
      text = message?.text?.body.trim();
      const phoneNumberId = value?.metadata?.phone_number_id;

      business = await Business.findOne({ phoneNumberId });
      if (!business) return res.sendStatus(200);
    }

    if (!text) {
      console.warn("⚠️ Empty message");
      return res.sendStatus(200);
    }

    // Get or create conversation state for this user + business
    let state = await ConversationState.findOne({ businessId: business._id, customerPhone: from });
    if (!state) {
      state = await ConversationState.create({
        businessId: business._id,
        customerPhone: from,
        step: 'menu',
        mode: 'gpt',
        data: {}
      });
    }

    if (state.mode === 'booking') {
      // Handle booking flow
      await handleBookingFlow(req, res, state, text, from, business);
    } else {
      // Detect if user wants booking
      if (/booking|book|reserve|حجز|予約|בְּרִירָה/i.test(text)) {
        state.mode = 'booking';
        state.step = 'selectService';
        state.data = {};
        await state.save();

        const services = business.services || [];
        if (services.length === 0) {
          await sendMessage(from, "Sorry, no services found to book.", business);
          return res.sendStatus(200);
        }

        let msg = "Please select a service by entering the number:\n";
        services.forEach((s, i) => {
          msg += `${i + 1}. ${s.name} - ${s.price}₪\n`;
        });
        await sendMessage(from, msg, business);
        return res.sendStatus(200);
      }

      // Else normal GPT reply
      const reply = await getReply(text, business, from);
      await sendMessage(from, reply, business);
      return res.sendStatus(200);
    }
  } catch (error) {
    console.error("❌ Webhook error:", error.message);
    res.sendStatus(500);
  }
});

// Start server
app.listen(process.env.PORT, () =>
  console.log(`✅ Server ready on http://localhost:${process.env.PORT}`)
);
