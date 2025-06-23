const express = require('express');
require('dotenv').config();
const cors = require('cors');
const connectToMongo = require('./db');
const Business = require('./models/Business');
const ConversationState = require('./models/ConversationState');
const { sendMessage, sendMenu } = require('./utils/sendMessage');
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

    const isTwilio = !!req.body.Body && !!req.body.From;
    let from, to, text, business;

    if (isTwilio) {
      from = req.body.From.replace('whatsapp:', '');
      to = req.body.To.replace('whatsapp:', '');
      text = req.body.Body?.trim();

      business = await Business.findOne({ whatsappNumber: to });
      if (!business) {
        console.log("⚠️ Business not found for Twilio number");
        return res.sendStatus(204);
      }
    } else {
      const value = req.body.entry?.[0]?.changes?.[0]?.value;
      const message = value?.messages?.[0];
      from = message?.from;
      text = message?.text?.body?.trim();
      const phoneNumberId = value?.metadata?.phone_number_id;

      business = await Business.findOne({ phoneNumberId });
      if (!business) {
        console.log("⚠️ Business not found for Meta phoneNumberId");
        return res.sendStatus(204);
      }
    }

    if (!text) {
      console.log('⚠️ Non-text message received (image, sticker, etc.)');
      return res.sendStatus(204);
    }

    let state = await ConversationState.findOne({ businessId: business._id, phoneNumber: from });

    // 👉 If new conversation → Create state and send menu immediately
    if (!state) {
      state = await ConversationState.create({
        businessId: business._id,
        phoneNumber: from,
        step: 'menu',
        mode: 'gpt',
        data: {}
      });

      await sendMenu(from, business);
      return res.sendStatus(204);
    }

    // Extract button payload if available
    const value = req.body.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    const buttonPayload = message?.button?.payload;

    // 📌 Booking Mode
    if (state.mode === 'booking') {
      await handleBookingFlow(req, res, state, text, from, business);
      return;
    }

    // 📌 Handle Button Replies
    if (buttonPayload) {
      if (buttonPayload === 'booking_option') {
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

      if (buttonPayload === 'location_option') {
        await sendMessage(from, `📍 We are located at: ${business.location}`, business);
        return res.sendStatus(204);
      }

      if (buttonPayload === 'info_option') {
        await sendMessage(from, `ℹ️ Our working hours are: ${business.hours}`, business);
        return res.sendStatus(204);
      }
    }

    // 📌 Menu Trigger
    if (/menu|options|خيارات|قائمة/i.test(text)) {
      await sendMenu(from, business);
      return res.sendStatus(204);
    }

    // 📌 Booking Keyword Detection
    if (/booking|book|reserve|حجز|予約|בְּרִירָה/i.test(text)) {
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

    // 📌 GPT Chat Mode
    const reply = await getReply(text, business, from);
    await sendMessage(from, reply, business);
    return res.sendStatus(204);

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.sendStatus(500);
  }
});






app.listen(process.env.PORT, () => console.log('✅ Server ready on http://localhost:' + process.env.PORT));
