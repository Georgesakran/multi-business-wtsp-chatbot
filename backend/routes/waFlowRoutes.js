// routes/waFlowsRoutes.js
const express = require("express");
const router = express.Router();
const Business = require("../models/Business");
const {
  buildServiceOptions,
  buildDateOptions,
  buildTimeOptions,
  createBookingFromFlow,
} = require("../utils/bookingAvailability");

// ✅ HEALTH CHECK
router.get("/booking/health", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * 📩 Main dynamic endpoint for Twilio Booking Flow
 * Twilio Flow makes POST requests here to load next step data or finalize a booking.
 */
router.post("/booking", async (req, res) => {
  try {
    const action = req.body?.action?.payload || {};
    const businessNumber = req.body?.from || req.query.from;

    // Find business by its WhatsApp number (Twilio Sender)
    const business = await Business.findOne({ "wa.number": businessNumber });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    // CASE 1: Flow asks for available services
    if (action.stage === "get_services") {
      const services = buildServiceOptions(business);
      return res.json({ services });
    }

    // CASE 2: Flow asks for available dates
    if (action.stage === "get_dates") {
      const dates = buildDateOptions(business);
      return res.json({ dates });
    }

    // CASE 3: Flow asks for available times
    if (action.stage === "get_times") {
      const { selectedDate, mainServiceId, addonServiceIds = [] } = action;
      const mainService = business.services.find(s => String(s._id) === mainServiceId);
      const addonDurations = addonServiceIds.map(id => {
        const s = business.services.find(x => String(x._id) === id);
        return s?.duration || 0;
      });

      const times = await buildTimeOptions(
        business,
        selectedDate,
        mainService?.duration || 0,
        addonDurations
      );
      return res.json({ times });
    }

    // CASE 4: Flow confirms booking
    if (action.stage === "confirm_booking") {
      const {
        mainServiceId,
        addonServiceIds = [],
        date,
        time,
        customerName,
        customerPhone,
        notes,
      } = action;

      const booking = await createBookingFromFlow({
        business,
        customerPhone,
        customerName,
        notes,
        date,
        time,
        mainServiceId,
        addonServiceIds,
      });

      console.log("✅ Booking created:", booking._id);
      return res.json({
        success: true,
        message: "Booking created successfully",
        bookingId: booking._id,
      });
    }

    // fallback
    return res.json({ message: "No matching stage" });
  } catch (err) {
    console.error("Flow Error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

module.exports = router;