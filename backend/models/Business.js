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
  whatsappNumber: { type: String, default: "" }, // old field you already had
  phoneNumberId: String,
  verifyToken: String,
  accessToken: String,

  // NEW WhatsApp/Twilio + Flows configuration (per business)
  wa: {
    number: { type: String, default: "" },               // E.164, e.g. +9725...
    messagingServiceSid: { type: String, default: "" },  // optional but recommended
    locale: { type: String, enum: ["en","ar","he"], default: "ar" },
    useFlows: { type: Boolean, default: true },

    flows: {
      booking: {
        id: { type: String, default: "" },      // Meta Flow ID (Booking) if you use Meta flows
        version: { type: String, default: "" }
      },
      order: {
        id: { type: String, default: "" },      // Meta Flow ID (Order)
        version: { type: String, default: "" }
      }
    },

    // Twilio Content Template SIDs per business
    templates: {
      // 1) Language selector (Quick Reply template with 3 buttons)
      languageSelectSid: { type: String, default: "" },

      // 2) Main menu (List Picker / Quick Reply) per language
      menu: {
        ar: { type: String, default: "" },
        en: { type: String, default: "" },
        he: { type: String, default: "" }
      },

      // 3) Booking flow templates (optional; fill as you create them)
      booking: {
        askServiceSid:   { type: String, default: "" },
        askDateSid:      { type: String, default: "" },
        askPeriodSid:    { type: String, default: "" },
        askTimeSid:      { type: String, default: "" },
        askNameSid:      { type: String, default: "" },
        askCitySid:      { type: String, default: "" },
        askAgeSid:       { type: String, default: "" },
        askNotesSid:     { type: String, default: "" },
        reviewSid:       { type: String, default: "" },
        confirmSid:      { type: String, default: "" }
      }
    }
  },

  // Language preference (fallback)
  language: {
    type: String,
    enum: ["arabic", "hebrew", "english"],
    default: "arabic"
  },

  // Type of business
  businessType: {
    type: String,
    enum: ["booking", "product", "info", "mixed", "event", "delivery"],
    required: true
  },

  enabledServices: [String], // e.g. ["bookingFlow", "productCatalog"]

  services: [serviceSchema],
  customFields: [customFieldSchema],

  closedDates: {
    type: [String], // YYYY-MM-DD
    default: []
  },

  faqs: [faqSchema],

  config: {
    chatbotEnabled: { type: Boolean, default: false },
  
    // Default business language (fallback if customer has none)
    language: { type: String, enum: ["arabic", "hebrew", "english"], default: "arabic" },
  
    systemPrompt: { type: String, default: "" },
  
    // OLD single-language fields (keep for backward compatibility)
    welcomeMessage: { type: String, default: "" },
    fallbackMessage: { type: String, default: "" },
  
    // NEW multi-language chatbot messages
    // 4 keys per language: welcome_first, welcome_returning, fallback, main_menu
    messages: {
      ar: {
        welcome_first:     { type: String, default: "" },
        welcome_returning: { type: String, default: "" },
        fallback:          { type: String, default: "" },
        main_menu:         { type: String, default: "" },
      },
      en: {
        welcome_first:     { type: String, default: "" },
        welcome_returning: { type: String, default: "" },
        fallback:          { type: String, default: "" },
        main_menu:         { type: String, default: "" },
      },
      he: {
        welcome_first:     { type: String, default: "" },
        welcome_returning: { type: String, default: "" },
        fallback:          { type: String, default: "" },
        main_menu:         { type: String, default: "" },
      },
    },
  
    features: {
      autoBooking:   { type: Boolean, default: false },
      productReplies:{ type: Boolean, default: false },
      faqSupport:    { type: Boolean, default: false }
    },
  
    booking: {
      workingDays:   [String],
      openingTime:   String,
      closingTime:   String,
      allowNotes:    Boolean,
      slotGapMinutes:Number
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

  // Provider toggle
  whatsappType: {
    type: String,
    enum: ["meta", "twilio"],
    default: "twilio"
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

  // Simple i18n for language buttons (if you ever render fallback text)
  i18n: {
    langButtons: {
      ar: { text: { type: String, default: "العربية" }, payload: { type: String, default: "LANG_AR" } },
      en: { text: { type: String, default: "English"  }, payload: { type: String, default: "LANG_EN" } },
      he: { text: { type: String, default: "עברית"    }, payload: { type: String, default: "LANG_HE" } }
    }
  },

  timezone: { type: String, default: "Asia/Jerusalem" },

  logs: [logSchema],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Helpful indexes for fast routing by number
businessSchema.index({ "wa.number": 1 }, { sparse: true });
businessSchema.index({ whatsappNumber: 1 }); // legacy

// Password Hash Middleware
businessSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model("Business", businessSchema);