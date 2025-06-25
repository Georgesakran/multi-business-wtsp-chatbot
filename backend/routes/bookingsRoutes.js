// routes/bookingsRoutes.js

const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Business = require("../models/Business");

router.get("/:businessId", async (req, res) => {
  try {
    const business = await Business.findById(req.params.businessId);
    if (!business || !business.enabledServices.includes("bookingFlow")) {
      return res.status(403).json({ error: "This business does not support bookings" });
    }

    const bookings = await Booking.find({ businessId: req.params.businessId }).sort({ date: 1, time: 1 });
    res.json(bookings);
  } catch (err) {
    console.error("❌ Failed to get bookings:", err.message);
    res.status(500).json({ error: "Server error fetching bookings" });
  }
});

module.exports = router;