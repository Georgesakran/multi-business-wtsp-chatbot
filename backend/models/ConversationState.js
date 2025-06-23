// 📂 models/ConversationState.js
const mongoose = require('mongoose');

const conversationStateSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  phoneNumber: { type: String, required: true, unique: true },
  step: { type: String, default: 'menu' },
  mode: { type: String, default: 'gpt' },
  data: { type: Object, default: {} },
});

module.exports = mongoose.model('ConversationState', conversationStateSchema);
