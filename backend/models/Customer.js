// models/Customer.js
const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema({
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", index: true, required: true },
    phone: { type: String, index: true, required: true },   // canonical E.164
    waPhone: { type: String, index: true },                 // if different (wa proxy)
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    language: { type: String, enum: ["arabic","hebrew","english"], default: "arabic" },
    tags: [String],
    // Preferences & GDPR/consent
    consent: {
      marketing: { type: Boolean, default: false },
      lastUpdated: { type: Date }
    },
    // Quick stats/counters
    stats: {
      orders: { type: Number, default: 0 },
      bookings: { type: Number, default: 0 },
      lastSeenAt: { type: Date }
    },
    meta: { type: Object, default: {} }
  }, { timestamps: true, versionKey: false });
  
  CustomerSchema.index({ businessId: 1, phone: 1 }, { unique: true });
  module.exports = mongoose.model("Customer", CustomerSchema);