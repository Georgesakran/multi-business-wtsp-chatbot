const express = require('express');
const router = express.Router();
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const ConversationState = require('../models/ConversationState');

router.post("/webhook", async (req, res) => {
    try {
      const isTwilio = !!req.body.Body && !!req.body.From;
  
      let from, to, text, business;
  
      if (isTwilio) {
        from = req.body.From.replace("whatsapp:", "");
        to = req.body.To.replace("whatsapp:", "");
        text = req.body.Body;
  
        business = await Business.findOne({ whatsappNumber: to });
        if (!business) return res.sendStatus(200);
      } else {
        // Meta flow...
      }
  
      // Step 1: Find or Create Conversation State
      let state = await ConversationState.findOne({ phoneNumber: from });
      if (!state) {
        state = await ConversationState.create({ phoneNumber: from, step: 'menu', mode: 'gpt' });
      }
  
      // Step 2: Check mode and route the message
      if (state.mode === 'booking') {
        await handleBookingFlow(req, res, state, text, from, business);
        return;
      } else {
        // GPT Flow
        if (text === '1' || text.toLowerCase().includes('booking')) {
          // User wants to start booking
          state.mode = 'booking';
          state.step = 'selectService';
          await state.save();
          await sendMessage(from, "Please select a service:\n1️⃣ Haircut\n2️⃣ Beard Trim\n3️⃣ Coloring", business);
          return res.sendStatus(200);
        }
  
        // Else: Process normally with GPT
        const reply = await getReply(text, business, from);
        await sendMessage(from, reply, business);
        return res.sendStatus(200);
      }
    } catch (error) {
      console.error("❌ Webhook error:", error.message);
      res.sendStatus(500);
    }
  });
  

module.exports = router;
