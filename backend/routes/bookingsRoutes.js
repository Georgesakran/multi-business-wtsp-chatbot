// routes/bookingsRoutes.js

const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Business = require("../models/Business");

// Get bookings for a specific business
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

// Update booking status
router.put("/update-status/:bookingId", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["pending", "confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const updated = await Booking.findByIdAndUpdate(
      req.params.bookingId,
      { status },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    console.error("❌ Error updating booking:", err.message);
    res.status(500).json({ error: "Failed to update booking" });
  }
});

module.exports = router;