// 📂 models/Booking.js
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  phoneNumber: { type: String, required: true },
  date: { type: String, required: true },      // e.g., 2025-06-24
  hour: { type: String, required: true },      // e.g., 10:00
  service: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);