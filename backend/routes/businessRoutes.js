const express = require("express");
const router = express.Router();
const Business = require("../models/Business");
const auth = require("../middleware/authMiddleware");

// Only allow admin to list all businesses
router.get("/", auth, async (req, res) => {
  try {
    if (req.user.username !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const businesses = await Business.find();
    res.json(businesses);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/businesses/:id - Get single business
// GET /api/businesses/:id - Get single business
router.get("/:id", async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ error: "Not found" });

    // Ensure default structure to prevent frontend crash
    if (!business.config) business.config = {};
    if (!business.config.booking) business.config.booking = {};
    if (!business.config.booking.workingDays) business.config.booking.workingDays = [];
    if (!business.config.booking.openingTime) business.config.booking.openingTime = "";
    if (!business.config.booking.closingTime) business.config.booking.closingTime = "";

    res.json(business);
  } catch (err) {
    console.error("❌ Failed to fetch business:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});
  
  
  // PUT /api/businesses/:id - Update business info
router.put('/:id', async (req, res) => {
    try {
      const business = await Business.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(business);
    } catch (err) {
      res.status(500).json({ error: 'Update failed' });
    }
});

router.put("/update-settings/:id", async (req, res) => {
  try {
    const businessId = req.params.id;
    const { workingDays, openingTime, closingTime } = req.body;

    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ error: "Business not found" });

    business.config.booking.workingDays = workingDays;
    business.config.booking.openingTime = openingTime;
    business.config.booking.closingTime = closingTime;

    await business.save();
    res.status(200).json({ message: "Settings updated", business });
  } catch (err) {
    console.error("Update settings error:", err);
    res.status(500).json({ error: "Server error" });
  }
});



module.exports = router;