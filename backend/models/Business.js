const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Define schema for individual services
const serviceSchema = new mongoose.Schema({
  name: String,
  price: Number,
  bookable: { type: Boolean, default: false }, // Whether it's a bookable service
  duration: Number, // in minutes (for bookable services)
  description: String,
});

// Main Business schema
const businessSchema = new mongoose.Schema({
  // Multilingual names
  nameEnglish: String,
  nameArabic: String,
  nameHebrew: String,

  // Basic credentials
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // WhatsApp integration
  whatsappNumber: { type: String, required: true },
  phoneNumberId: String,
  verifyToken: String,
  accessToken: String,

  // Language preference
  language: {
    type: String,
    enum: ["arabic", "hebrew", "english"],
    default: "arabic",
  },

  // Type of business (determines chatbot logic)
  businessType: {
    type: String,
    enum: ["booking", "product", "info", "mixed", "event", "delivery"],
    required: true,
  },

  // Which chatbot features to enable
  enabledServices: [String], // ["bookingFlow", "productCatalog", "customerSupport", etc.]

  // Services offered by this business
  services: [serviceSchema],

  // Business working schedule
  closedDates: {
    type: [String], // Specific dates the business is closed (YYYY-MM-DD)
    default: [],
  },

  // Optional configuration per flow type
  config: {
    booking: {
      workingDays: [String],
      openingTime: String,
      closingTime: String,
      allowNotes: Boolean,
      slotGapMinutes: Number,
    },
    product: {
      allowPriceInquiry: { type: Boolean, default: true },
    },
    delivery: {
      requireAddress: { type: Boolean, default: false },
    },
    event: {
      eventList: [String],
    },
  },

  // Meta or Twilio
  whatsappType: {
    type: String,
    enum: ["meta", "twilio"],
    default: "meta",
  },

  isActive: { type: Boolean, default: true },
});

// 🔐 Password hashing middleware
businessSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model("Business", businessSchema);