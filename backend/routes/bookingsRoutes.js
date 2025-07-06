// routes/bookingsRoutes.js

const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Business = require("../models/Business");
const { protect } = require("../middleware/authMiddleware");


// Get bookings for a specific business
router.get("/:businessId", protect,async (req, res) => {
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

// POST /bookings - Owner manually adds a booking
router.post("/", protect,async (req, res) => {
  const {
    businessId,
    customerName,
    phoneNumber,
    service,
    date,
    time,
    status
  } = req.body;
  try {
    const newBooking = new Booking({
      businessId,
      customerName,
      phoneNumber,
      service,
      date,
      time,
      status: status || "pending",
    });

    await newBooking.save();
    res.status(201).json({ message: "✅ Booking added successfully", booking: newBooking });
  } catch (err) {
    console.error("❌ Error creating booking:", err);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// PUT /bookings/:id - Edit a booking
router.put("/:id", protect,async (req, res) => {
  try {
    const updated = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(updated);
  } catch (err) {
    console.error("❌ Error updating booking:", err);
    res.status(500).json({ error: "Failed to update booking" });
  }
});

// DELETE /bookings/:id - Delete a booking
router.delete("/:id", protect,async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ message: "🗑️ Booking deleted" });
  } catch (err) {
    console.error("❌ Error deleting booking:", err);
    res.status(500).json({ error: "Failed to delete booking" });
  }
});
module.exports = router;