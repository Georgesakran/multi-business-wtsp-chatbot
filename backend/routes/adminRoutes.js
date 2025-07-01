const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Business = require("../models/Business");
const { protect } = require("../middleware/authMiddleware");


// POST /api/admin/businesses
router.post("/NewBusiness", protect,async (req, res) => {
  const {
    username,
    password,
    nameEnglish,
    nameArabic,
    nameHebrew,
    whatsappNumber,
    language,
    businessType,
    enabledServices
  } = req.body;

  try {
    const whatsappNumberexisting = await Business.findOne({ whatsappNumber });
    if (whatsappNumberexisting) {
      return res.status(400).json({ error: "whatsappNumber already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newBusiness = new Business({
      username,
      password: hashedPassword,
      nameEnglish,
      nameArabic,
      nameHebrew,
      whatsappNumber,
      phoneNumberId:"",
      verifyToken:"",
      accessToken:"",
      language,
      businessType: req.body.businessType || "booking",
      enabledServices: req.body.enabledServices || [],
      whatsappType: "twilio",
      isActive: true,
      config: {
        booking: {
          workingDays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
          openingTime: "09:00",
          closingTime: "17:00",
          allowNotes: false,
          slotGapMinutes: 15,
        },
        product: { allowPriceInquiry: false },
        delivery: { requireAddress: false },
        event: { eventList: [] },
      },
      services: [],
    });

    await newBusiness.save();
    res.status(201).json({ message: "✅ Business added successfully" });

  } catch (err) {
    console.error("❌ Failed to add business:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/reset-password/:username", protect,async (req, res) => {
  try {
    const { newPassword } = req.body;
    const hashed = await bcrypt.hash(newPassword, 10);
    const updated = await Business.findOneAndUpdate(
      { username: req.params.username },
      { password: hashed }
    );

    if (!updated) return res.status(404).json({ error: "Business not found" });
    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;