const express = require('express');
require('dotenv').config();
const cors = require('cors');
const connectToMongo = require('./db');
const Business = require('./models/Business');
const ConversationState = require('./models/ConversationState');
const { sendMessage } = require('./utils/sendMessage');
const { getReply } = require('./utils/getReply');
const handleBookingFlow = require('./bookingFlow/handleBookingFlow');

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
connectToMongo();

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
  try {
    console.log('---Webhook POST received---');
    // Detect Twilio or Meta incoming message format
    const isTwilio = !!req.body.Body && !!req.body.From;

    let from, to, text, business;

    if (isTwilio) {
      from = req.body.From.replace('whatsapp:', '');
      to = req.body.To.replace('whatsapp:', '');
      text = req.body.Body.trim();

      business = await Business.findOne({ whatsappNumber: to });
      if (!business) {
        console.log("⚠️ Business not found for Twilio number");
        return res.sendStatus(204);
      }
    } else {
      // Meta WhatsApp webhook payload
      const value = req.body.entry?.[0]?.changes?.[0]?.value;
      const message = value?.messages?.[0];
      from = message?.from;
      text = message?.text?.body.trim();
      const phoneNumberId = value?.metadata?.phone_number_id;

      business = await Business.findOne({ phoneNumberId });
      if (!business) {
        console.log("⚠️ Business not found for Meta phoneNumberId");
        return res.sendStatus(204);
      }
    }

    if (!text) {
      console.log('⚠️ Empty message text received');
      return res.sendStatus(204);
    }

    // Load or create conversation state
    let state = await ConversationState.findOne({ businessId: business._id, phoneNumber: from });
    if (!state) {
      state = await ConversationState.create({
        businessId: business._id,
        phoneNumber: from,
        step: 'menu',
        mode: 'gpt',
        data: {}
      });
    }

    if (state.mode === 'booking') {
      // Booking flow mode
      await handleBookingFlow(req, res, state, text, from, business);
      // IMPORTANT: handleBookingFlow calls res.sendStatus(200)
      return;
    } else {
      // Not in booking mode
      if (/booking|book|reserve|حجز|予約|בְּרִירָה/i.test(text)) {
        // Switch to booking flow
        state.mode = 'booking';
        state.step = 'selectService';
        state.data = {};
        await state.save();

        const services = business.services || [];
        if (services.length === 0) {
          await sendMessage(from, "Sorry, no services found to book.", business);
          return res.sendStatus(204);
        }

        let msg = 'Please select a service by entering the number:\n';
        services.forEach((s, i) => {
          msg += `${i + 1}. ${s.name} - ${s.price}₪\n`;
        });

        await sendMessage(from, msg, business);
        return res.sendStatus(204);
      }

      // Normal GPT chat mode
      const reply = await getReply(text, business, from);
      await sendMessage(from, reply, business);
      return res.sendStatus(204);
    }

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.sendStatus(500);
  }
});




app.listen(process.env.PORT, () => console.log('✅ Server ready on http://localhost:' + process.env.PORT));
