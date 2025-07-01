// seedServices.js
const mongoose = require("mongoose");
const Business = require("./models/Business"); // Update the path if needed
require("dotenv").config(); // Load MONGO_URI from .env

async function addServicesToBusiness() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const businessUsername = "dina_nails"; // 👈 Change to your target business
  const business = await Business.findOne({ username: businessUsername });

  if (!business) {
    console.error("❌ Business not found");
    return;
  }

  // 3 Services
  const newServices = [
    {
      name: { en: "Basic Manicure", ar: "مانيكير بسيط", he: "מניקור בסיסי" },
      description: {
        en: "Nail shaping, cuticle care and basic polish",
        ar: "تشكيل الأظافر والعناية بالبشرة الأساسية",
        he: "עיצוב ציפורניים וטיפול בסיסי בעור"
      },
      price: 70,
      duration: 30,
      category: "nails",
      tags: ["nails", "manicure", "basic"],
      bookable: true,
      isActive: true,
    },
    {
      name: { en: "Gel Polish", ar: "طلاء جل", he: "לק ג'ל" },
      description: {
        en: "Long-lasting gel polish for hands",
        ar: "طلاء جل طويل الأمد لليدين",
        he: "לק ג'ל עמיד לידיים"
      },
      price: 120,
      duration: 45,
      category: "nails",
      tags: ["gel", "nails", "shine"],
      bookable: true,
      isActive: true,
    },
    {
      name: { en: "Nail Art Design", ar: "تصميم فن الأظافر", he: "עיצוב ציפורניים" },
      description: {
        en: "Custom creative designs for nails",
        ar: "تصاميم فنية مخصصة للأظافر",
        he: "עיצובים יצירתיים מותאמים לציפורניים"
      },
      price: 150,
      duration: 60,
      category: "nails",
      tags: ["art", "creative", "nail design"],
      bookable: true,
      isActive: true,
    }
  ];

  // Add to business services
  business.services.push(...newServices);

  await business.save();
  console.log("✅ Services added successfully!");

  mongoose.connection.close();
}

addServicesToBusiness().catch((err) => {
  console.error("❌ Error:", err);
  mongoose.connection.close();
});