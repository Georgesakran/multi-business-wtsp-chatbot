// routes/waFlowsRoutes.js
const express = require("express");
const router = express.Router();
const Business = require("../models/Business");
const Booking = require("../models/Booking");

// we'll create these in utils/bookingAvailability.js next
const {
  buildServiceOptions,
  buildDateOptions,
  buildTimeOptions,
  createBookingFromFlow,
} = require("../utils/bookingAvailability");

// health check, Twilio can ping this
router.get("/booking/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// main data endpoint for Twilio Flow
router.post("/booking", async (req, res) => {
  try {

    // console.log("📩 /api/wa/flows/booking incoming:", req.body);
    console.log("🔥 FLOW HIT 🔥");
    console.log(JSON.stringify(req.body, null, 2));

    // Identify which business this request belongs to
    // "from" = the business WhatsApp number (the sender number in Twilio)
    const businessNumber = req.body.from || req.query.from;
    if (!businessNumber) {
      return res.status(400).json({ error: "Missing 'from' (business number)" });
    }

    // find the right business by wa.number
    const business = await Business.findOne({
      "wa.number": businessNumber,
      isActive: true,
    });
    
    if (!business) {
      console.log("❌ No business for number:", businessNumber);
      return res.status(404).json({ error: "Business not found" });
    }

    // action payload from the Flow
    // Twilio can send shape like { action: {...} } or { action: { stage:'...' } }
    const action = req.body.action || {};
    const stage = action.stage;

    // we will respond differently depending on stage
    switch (stage) {
    
      case "get_services": {
        // return list of bookable services
        const services = buildServiceOptions(business);
        return res.json({ services });
      }

      case "get_dates": {
        const serviceId = action.serviceId;
        const dates = buildDateOptions(business, serviceId);
        return res.json({ dates });
      }

      case "get_times": {
        const { serviceId, date } = action;
        const times = await buildTimeOptions({
          business,
          serviceId,
          date,
        });
        return res.json({ times });
      }

      case "confirm_booking": {
        // Twilio should pass us the final answers collected in the Flow
        const {
          serviceId,
          addonIds,        // optional list of extra service ids
          date,
          time,
          customerName,
          notes,
          customerPhone,
        } = action;

        const bookingDoc = await createBookingFromFlow({
          business,
          serviceId,
          addonIds,
          date,
          time,
          customerName,
          notes,
          customerPhone,
        });

        return res.json({
          success: true,
          bookingId: bookingDoc._id,
        });
      }

      default: {
        // If stage missing or unknown, just return services (first screen fallback)
        const services = buildServiceOptions(business);
        return res.json({ services, message: "fallback_first_screen" });
      }
    }
  } catch (err) {
    console.error("🔥 booking flow error:", err);
    // IMPORTANT: Twilio Flow expects 200 always.
    // Don't 500 here, just send empty so UI doesn't explode.
    return res.status(200).json({
      error: "server_error",
      details: err.message,
    });
  }
});

module.exports = router;