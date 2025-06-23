// 📂 utils/getReply.js
const OpenAI = require('openai');
const Message = require('../models/Message');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getReply(text, business, customerId) {
  const previousMessages = await Message.find({
    businessId: business._id,
    customerId,
  })
    .sort({ timestamp: -1 })
    .limit(5)
    .lean();

  const history = previousMessages.reverse().map((msg) => ({ role: msg.role, content: msg.content }));

  const serviceList = business.services
    .map((s) => `• ${s.name}: ${s.price}₪`)
    .join('\n');

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
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: text },
    ],
  });

  const reply = completion.choices[0].message.content;

  await Message.create([
    { businessId: business._id, customerId, role: 'user', content: text },
    { businessId: business._id, customerId, role: 'assistant', content: reply },
  ]);

  return reply;
}

module.exports = { getReply };