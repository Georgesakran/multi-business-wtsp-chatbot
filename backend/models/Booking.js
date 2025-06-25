// models/Booking.js
const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
  customerName: String,
  phoneNumber: String,
  service: String,
  date: String, // YYYY-MM-DD
  time: String, // HH:mm
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled"],
    default: "pending"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Booking", bookingSchema);