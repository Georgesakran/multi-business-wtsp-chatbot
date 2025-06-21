const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
    required: true,
  },
  customerId: {
    type: String, // WhatsApp number (e.g., '97258333xxxx')
    required: true,
  },
  role: {
    type: String, // 'user' or 'assistant'
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Message", MessageSchema);