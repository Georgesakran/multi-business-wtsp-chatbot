const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const serviceSchema = new mongoose.Schema({
  name: String,
  price: Number,
  bookable : { type: Boolean, default: false },
  duration: Number, // in minutes , for bookable only
  availableHours: [String], // array of time slots, e.g. ["09:00", "10:00"]
  description: String,
});

const businessSchema = new mongoose.Schema({
  nameEnglish: String,
  nameArabic: String,
  nameHebrew: String, 
  businessName: String,
  busineessType: {
    type: String,
    enum: ["booking","product","mixed","info","event","delievery"],
    required: true,
  }, // consider splitting into multilingual names if needed
  
  whatsappNumber: { type: String, required: true },

  features:[String], // e.g. ["booking", "catalog", "faq",]
  services: [serviceSchema], // array of services offered by the business
  config: {
    booking: {
      workingDays: [String], // e.g. ["Sunday", "Monday"]
      allowNotes: Boolean,
      slotGapMinutes: Number
    },
    product: {
      allowPriceInquiry: Boolean
    },
    delivery: {
      requireAddress: Boolean
    },
    event: {
      eventList: [String] // optional list of event titles
    }
  },

  language: {
    type: String,
    enum: ["arabic", "hebrew", "english"],
    default: "arabic",
  },
  hours: String,
  location: String,
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  whatsappType: {
    type: String,
    enum: ["meta", "twilio"],
    default: "meta"
  },
  isActive: { type: Boolean, default: true },
});

// Hash password before save
businessSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model("Business", businessSchema);