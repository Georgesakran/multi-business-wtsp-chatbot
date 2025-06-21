
const express = require("express");
require("dotenv").config();
const cors = require("cors");
const axios = require("axios");
const OpenAI = require("openai");
const connectToMongo = require("./db");

const Business = require("./models/Business");
const Message = require("./models/Message");

const authRoutes = require("./routes/authRoutes");
const businessRoutes = require("./routes/businessRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// ✅ CORS should come FIRST
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://multi-business-wtsp-chatbot.vercel.app",
    "https://multi-business-wtsp-chatbot-pvzn01btu-george-sakrans-projects.vercel.app" // ← New Vercel build URL
  ],
  credentials: true
}));

// ✅ Then express middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Now connect to DB
connectToMongo();

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/admin", adminRoutes);

// OpenAI init (unchanged)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});



// Verify Webhook for Meta
app.get("/webhook", async (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (!mode || !token) return res.sendStatus(403);

  // 🔍 Find matching business by verifyToken
  const business = await Business.findOne({ verifyToken: token });

  if (mode === "subscribe" && business) {
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});

// Handle incoming message
app.post("/webhook", async (req, res) => {
  const value = req.body.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];
  const toPhone = value?.metadata?.phone_number_id; // Bot's WhatsApp number

  if (!message || !toPhone) return res.sendStatus(200);

  // 🎯 Find business by phoneNumberId
  const business = await Business.findOne({ phoneNumberId: toPhone });
  if (!business) return res.sendStatus(200);

  const from = message.from;
  const text = message.text?.body;

  if (!text) {
    await sendMessage(from, "❗ Sorry, I can only respond to text messages.", business);
    return res.sendStatus(200);
  }

  const reply = await getReply(text, business, from);
  
  await sendMessage(from, reply, business);

  res.sendStatus(200);
});

// Smart Reply Generator
async function getReply(text, business, customerId) {
  // Fetch last 5 messages between this user and business
  const previousMessages = await Message.find({
    businessId: business._id,
    customerId: customerId,
  })
    .sort({ timestamp: -1 })
    .limit(5)
    .lean();

  const history = previousMessages
    .reverse()
    .map((msg) => ({ role: msg.role, content: msg.content }));

  const serviceList = business.services
    .map((s) => `• ${s.name}: ${s.price}₪`)
    .join("\n");

  const systemPrompt = `
You are a friendly chatbot working for "${business.businessName}".
You are located in: ${business.location}
Working Hours: ${business.hours}
WhatsApp: ${business.whatsappNumber}
Languages spoken: ${business.language}

Available services:
${serviceList}

Your job is to help with:
- Services info
- Prices
- Location/hours
- Booking (in future)

Only answer related questions. Politely redirect if unrelated.
Answer briefly, naturally, and in ${business.language}.
  `.trim();

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: text },
    ],
  });

  const reply = completion.choices[0].message.content;

  // Save both user and assistant messages
  await Message.create([
    {
      businessId: business._id,
      customerId,
      role: "user",
      content: text,
    },
    {
      businessId: business._id,
      customerId,
      role: "assistant",
      content: reply,
    },
  ]);

  return reply;
}

// WhatsApp Send
async function sendMessage(to, text, business) {
  await axios.post(
    `https://graph.facebook.com/v18.0/${business.phoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${business.accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
}

// const twilio = require("twilio");

// const twilioClient = twilio(
//   process.env.TWILIO_ACCOUNT_SID,
//   process.env.TWILIO_AUTH_TOKEN
// );

// async function sendMessage(to, text, business) {
//   try {
//     const message = await twilioClient.messages.create({
//       from: process.env.TWILIO_PHONE_NUMBER, // Twilio sandbox number
//       to: `whatsapp:${to}`, // e.g. whatsapp:+972581234567
//       body: text,
//     });

//     console.log("📤 Twilio message sent:", message.sid);
//   } catch (error) {
//     console.error("❌ Failed to send via Twilio:", error.message);
//   }
// }

// Start server
app.listen(process.env.PORT, () =>
  console.log("✅ Server ready on http://localhost:" + process.env.PORT)
);