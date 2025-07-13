// models/Booking.js
const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
  customerName: String,
  phoneNumber: String,
  service: {
    en: { type: String, required: true },
    ar: { type: String },
    he: { type: String },
  },  
  date: String, // YYYY-MM-DD
  time: String, // HH:mm
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled"],
    default: "pending"
  },
  source: {
    type: String,
    enum: ["chatbot", "manual", "whatsapp", "other"],
    default: "manual"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Booking", bookingSchema);