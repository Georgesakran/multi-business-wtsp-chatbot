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
  duration: { type: Number }, // in minutes
  category: { type: String, default: "" },
  tags: { type: [String], default: [] },
  isActive: { type: Boolean, default: true },
  image: { type: String, default: "" }, // image path or URL
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
  //updatedAt: { type: Date, default: Date.now },
  
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

  // WhatsApp integration
  whatsappNumber: { type: String, required: true },
  phoneNumberId: String,
  verifyToken: String,
  accessToken: String,

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
    type: [String], // Format: YYYY-MM-DD
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