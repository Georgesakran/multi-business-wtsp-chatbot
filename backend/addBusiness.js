// addBusiness.js
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Business = require("./models/Business");

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log("✅ Connected to MongoDB");

  const newBusiness = new Business({
    "nameEnglish": "Dina's Salon Nails",
    "businessName": "Dina's Salon",
    "whatsappNumber": "+14155238886",  // From Twilio
    "language": "arabic",
    "services": [
      { "name": "Nail Polish", "price": 30 },
      { "name": "Manicure", "price": 50 }
    ],
    "hours": "Mon-Sat 10:00 - 18:00",
    "location": "Nazareth",
    "phoneNumberId": "",                // Leave empty for Twilio
    "verifyToken": "",                  // Leave empty for Twilio
    "accessToken": "",                  // Leave empty for Twilio
    "username": "dina_salon",
    "password": "dina123",              // Will be hashed
    "whatsappType": "twilio"
  });

  await newBusiness.save();
  console.log("🎉 Business added successfully!");
  process.exit();
}).catch((err) => {
  console.error("❌ Error connecting to DB:", err);
  process.exit(1);
});