const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
  customerPhone: { type: String, required: true },
  service: { type: String, required: true },
  day: { type: String, required: true },   // Could be a string date or day name
  time: { type: String, required: true },  // Time slot selected
  status: { type: String, default: "pending" }, // pending, confirmed, cancelled
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Booking", bookingSchema);
