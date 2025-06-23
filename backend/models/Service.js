// models/Service.js
const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  serviceName: { type: String, required: true },
  duration: { type: Number, required: true }, // in minutes
  availableSlots: [{ type: String }] // e.g. ["09:00 AM", "10:00 AM", "11:00 AM"]
});

module.exports = mongoose.model('Service', ServiceSchema);
