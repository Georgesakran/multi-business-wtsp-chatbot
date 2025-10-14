// models/Booking.js
const mongoose = require("mongoose");

const ServiceSnapshotSchema = new mongoose.Schema(
  {
    name: {
      en: { type: String, default: "" },
      ar: { type: String, default: "" },
      he: { type: String, default: "" },
    },
    price: { type: Number, default: 0, min: 0 },
    duration: { type: Number, default: 0, min: 0 }, // minutes
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    customerName: { type: String, trim: true },
    phoneNumber: { type: String, trim: true },

    // Optional: link to embedded service in Business.services
    serviceId: { type: mongoose.Schema.Types.ObjectId }, // (ref is Business.services[*]._id)

    // Required for display/reporting even if service later changes in catalog
    serviceSnapshot: { type: ServiceSnapshotSchema, default: () => ({}) },

    // Optional: if you add staff later
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },

    // Scheduling
    date: { type: String, required: true }, // "YYYY-MM-DD"
    time: { type: String, required: true }, // "HH:mm"

    // Other fields
    locationId: { type: String, default: "" },
    notes: { type: String, default: "" },

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
      index: true,
    },
    source: {
      type: String,
      enum: ["chatbot", "manual", "whatsapp", "other"],
      default: "manual",
      index: true,
    },

    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

/* ---- Indexes for fast lookups ---- */
bookingSchema.index({ businessId: 1, date: 1, time: 1 });
bookingSchema.index({ businessId: 1, status: 1, date: 1 });

module.exports = mongoose.model("Booking", bookingSchema);