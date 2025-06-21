// routes/adminRoutes.js

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
    phoneNumberId,
    verifyToken,
    accessToken,
    language
  } = req.body;

  try {
    const existing = await Business.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newBusiness = new Business({
      username,
      password: hashedPassword,
      nameEnglish,
      nameArabic,
      nameHebrew,
      whatsappNumber,
      phoneNumberId,
      verifyToken,     // ✅ save it
      accessToken,     // ✅ save it
      language
    });

    await newBusiness.save();
    res.status(201).json({ message: "Business added" });

  } catch (err) {
    console.error("Failed to add business:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;