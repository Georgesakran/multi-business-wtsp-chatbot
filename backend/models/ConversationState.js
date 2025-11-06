const mongoose = require("mongoose");

const conversationStateSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
  phoneNumber: { type: String, required: true }, // E.164 user number
  step: { type: String, default: "LANG_PICK" },
  data: { type: Object, default: {} } // arbitrary state data
}, { timestamps: true, versionKey: false });

conversationStateSchema.index({ businessId: 1, phoneNumber: 1 }, { unique: true });

module.exports = mongoose.model("ConversationState", conversationStateSchema);