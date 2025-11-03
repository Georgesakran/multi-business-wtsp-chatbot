// models/ConversationState.js
const mongoose = require("mongoose");

const conversationStateSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
  phoneNumber: { type: String, required: true }, // E.164 user number
  step: { type: String, default: "SELECT_SERVICE" },
  data: { type: Object, default: {} } // holds selections: {serviceId, date, period, time, addons, name, notes}
}, { timestamps: true, versionKey: false });

conversationStateSchema.index({ businessId: 1, phoneNumber: 1 }, { unique: true });
module.exports = mongoose.model("ConversationState", conversationStateSchema);