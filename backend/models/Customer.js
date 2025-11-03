// models/Customer.js
const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", index: true, required: true },
  phone: { type: String, index: true, required: true },   // E.164 user number
  name: { type: String, default: "" },
  city: { type: String, default: "" },
  age: { type: Number },
  language: { type: String, enum: ["arabic","hebrew","english"], default: "arabic" },
  consent: {
    marketing: { type: Boolean, default: false },
    lastUpdated: { type: Date }
  },
  stats: {
    bookings: { type: Number, default: 0 },
    lastSeenAt: { type: Date }
  },
  meta: { type: Object, default: {} }
}, { timestamps: true, versionKey: false });

CustomerSchema.index({ businessId: 1, phone: 1 }, { unique: true });
module.exports = mongoose.model("Customer", CustomerSchema);