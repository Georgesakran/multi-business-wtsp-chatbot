const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const Booking = require("../models/Booking");
const Business = require("../models/Business");

// GET /overview/:businessId/day-overview?date=YYYY-MM-DD
router.get("/:businessId/week-summary", protect, async (req, res) => {
  const { businessId } = req.params;

  const today = new Date();
  const next7Dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d.toISOString().split("T")[0]; // 'YYYY-MM-DD'
  });

  try {
    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ error: "Business not found" });

    const bookings = await Booking.find({
      businessId,
      date: { $in: next7Dates },
    });

    const days = {};

    for (let dateStr of next7Dates) {
      const d = new Date(dateStr);
      const weekday = d.toLocaleDateString("en-US", { weekday: "long" }); // e.g. "Monday"
      const isOff = !business.config?.booking?.workingDays?.includes(weekday);

      const open = isOff ? null : business.config?.booking?.openingTime || null;
      const close = isOff ? null : business.config?.booking?.closingTime || null;

      const dayBookings = bookings.filter(b => b.date === dateStr && b.status !== "cancelled");

      const statusCounts = {};
      dayBookings.forEach(b => {
        statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
      });

      days[dateStr] = {
        isOff,
        open,
        close,
        totalBookings: dayBookings.length,
        statusCounts,
        bookings: dayBookings, // 👈 Add this line
      };
      
    }

    res.json({ days });
  } catch (err) {
    console.error("❌ Failed to get week summary", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;