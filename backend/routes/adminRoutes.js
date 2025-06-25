const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Business = require("../models/Business");

// POST /api/admin/businesses
router.post("/NewBusiness", async (req, res) => {
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
      language,
      businessType,
      enabledServices,
    });

    await newBusiness.save();
    res.status(201).json({ message: "✅ Business added successfully" });

  } catch (err) {
    console.error("❌ Failed to add business:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/reset-password/:username", async (req, res) => {
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