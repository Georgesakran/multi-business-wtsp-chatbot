const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ==========================
// Sub-schema: Service
// ==========================
const serviceSchema = new mongoose.Schema({
  name: {
    en: { type: String, required: true },
    ar: { type: String, default: "" },
    he: { type: String, default: "" }
  },
  description: {
    en: { type: String, default: "" },
    ar: { type: String, default: "" },
    he: { type: String, default: "" }
  },
  price: { type: Number, default: 0 },
  bookable: { type: Boolean, default: false },
  duration: { type: Number }, // minutes
  category: { type: String, default: "" },
  tags: { type: [String], default: [] },
  isActive: { type: Boolean, default: true },
  image: { type: String, default: "" },
}, { timestamps: true });

// ==========================
// Sub-schema: FAQ
// ==========================
const faqSchema = new mongoose.Schema({
  question: {
    en: { type: String, required: true },
    ar: { type: String, default: "" },
    he: { type: String, default: "" }
  },
  answer: {
    en: { type: String, required: true },
    ar: { type: String, default: "" },
    he: { type: String, default: "" }
  },
  createdAt: { type: Date, default: Date.now },
});

// ==========================
// Sub-schema: Custom Fields (Optional)
// ==========================
const customFieldSchema = new mongoose.Schema({
  fieldName: String,
  fieldType: {
    type: String,
    enum: ["text", "number", "checkbox"],
    default: "text"
  },
  required: { type: Boolean, default: false }
});

// ==========================
// Sub-schema: Logs (Optional)
// ==========================
const logSchema = new mongoose.Schema({
  action: String,
  timestamp: { type: Date, default: Date.now },
  by: String
});

// ==========================
// Main Business Schema
// ==========================
const businessSchema = new mongoose.Schema({
  // Multilingual names
  nameEnglish: String,
  nameArabic: String,
  nameHebrew: String,

  // Basic credentials
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // (LEGACY) WhatsApp integration (kept for backward compatibility)
  whatsappNumber: { type: String, default: "" }, // old field you already have
  phoneNumberId: String,
  verifyToken: String,
  accessToken: String,

  // NEW WhatsApp/Twilio + Flows configuration (per business)
  wa: {
    number: { type: String, default: "" },               // E.164, e.g. +972525561686 (Twilio WA sender)
    messagingServiceSid: { type: String, default: "" },  // Twilio Messaging Service SID (recommended)
    locale: { type: String, enum: ["en","ar","he"], default: "ar" },
    useFlows: { type: Boolean, default: true },

    flows: {
      booking: {
        id: { type: String, default: "" },      // Meta Flow ID (Booking)
        version: { type: String, default: "" }
      },
      order: {
        id: { type: String, default: "" },      // Meta Flow ID (Order)
        version: { type: String, default: "" }
      }
    },

    templates: {
      bookingLaunch: { type: String, default: "" }, // Twilio Content Template SID to launch Booking Flow
      orderLaunch:   { type: String, default: "" }, // Twilio Content Template SID to launch Order Flow
      bookingConfirm:{ type: String, default: "" }, // (optional) confirmation template SID
      orderConfirm:  { type: String, default: "" }  // (optional)
    }
  },

  // Language preference
  language: {
    type: String,
    enum: ["arabic", "hebrew", "english"],
    default: "arabic"
  },

  // Type of business (determines chatbot logic)
  businessType: {
    type: String,
    enum: ["booking", "product", "info", "mixed", "event", "delivery"],
    required: true
  },

  // Which chatbot features to enable
  enabledServices: [String], // ["bookingFlow", "productCatalog", etc.]

  // Services array
  services: [serviceSchema],

  // Custom fields for bookings (optional)
  customFields: [customFieldSchema],

  // Business working schedule and configs
  closedDates: {
    type: [String], // YYYY-MM-DD
    default: []
  },

  faqs: [faqSchema],

  config: {
    chatbotEnabled: { type: Boolean, default: false },
    language: { type: String, enum: ["arabic", "hebrew", "english"], default: "arabic" },
    systemPrompt: { type: String, default: "" },
    welcomeMessage: { type: String, default: "" },
    fallbackMessage: { type: String, default: "" },
    features: {
      autoBooking: { type: Boolean, default: false },
      productReplies: { type: Boolean, default: false },
      faqSupport: { type: Boolean, default: false }
    },
    booking: {
      workingDays: [String],
      openingTime: String,
      closingTime: String,
      allowNotes: Boolean,
      slotGapMinutes: Number
    },
    product: {
      allowPriceInquiry: { type: Boolean, default: true }
    },
    delivery: {
      requireAddress: { type: Boolean, default: false }
    },
    event: {
      eventList: [String]
    }
  },

  // Meta or Twilio
  whatsappType: {
    type: String,
    enum: ["meta", "twilio"],
    default: "meta"
  },

  // Business owner info (optional)
  owner: {
    fullName: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" }
  },

  // Location info (optional)
  location: {
    city: String,
    street: String,
    lat: Number,
    lng: Number
  },

  // Admin log (optional)
  logs: [logSchema],

  // Status flag
  isActive: { type: Boolean, default: true }

}, { timestamps: true });

// Helpful indexes for fast routing by number
businessSchema.index({ "wa.number": 1 });
businessSchema.index({ whatsappNumber: 1 }); // legacy

// ==========================
// Password Hash Middleware
// ==========================
businessSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model("Business", businessSchema);