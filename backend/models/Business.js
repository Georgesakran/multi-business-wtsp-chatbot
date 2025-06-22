const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const serviceSchema = new mongoose.Schema({
  name: String,
  price: Number,
});

const businessSchema = new mongoose.Schema({
  nameEnglish: String,
  nameArabic: String,
  nameHebrew: String, 
  businessName: String, // consider splitting into multilingual names if needed
  whatsappNumber: { type: String, required: true },
  verifyToken: { type: String, required: true },
  accessToken: { type: String, required: true },  
  language: {
    type: String,
    enum: ["arabic", "hebrew"],
    default: "arabic",
  },
  services: [serviceSchema],
  hours: String,
  location: String,
  verifyToken: String,
  accessToken: String,
  phoneNumberId: String,

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