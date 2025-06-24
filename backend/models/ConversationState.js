const mongoose = require('mongoose');

const conversationStateSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  phoneNumber: { type: String, required: true },
  step: { type: String, default: 'menu' },
  mode: { type: String, default: 'gpt' },
  data: { type: Object, default: {} },
}, { timestamps: true });

// ✅ اجعل combination من businessId + phoneNumber فريدdsfsefsfe
conversationStateSchema.index({ businessId: 1, phoneNumber: 1 }, { unique: true });

module.exports = mongoose.model('ConversationState', conversationStateSchema);