// models/ConversationState.js
const mongoose = require('mongoose');

const ConversationStateSchema = new mongoose.Schema({
  customerPhone: { type: String, required: true, unique: true },
    step: { type: String, required: true, default: 'menu' }, 
    mode: { type: String, required: true, default: 'gpt' }, // 'gpt' or 'booking'
    data: { type: Object, default: {} },
    updatedAt: { type: Date, default: Date.now }
  });
  

module.exports = mongoose.model('ConversationState', ConversationStateSchema);
