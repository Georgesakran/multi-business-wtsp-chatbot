// routes/clientsRoutes.js
const express = require("express");
const router = express.Router();
const Business = require("../models/Business");
const Booking = require("../models/Booking");
const { protect } = require("../middleware/authMiddleware");

/* ============================
   Get all clients for a business
   ============================ */
router.get("/:businessId", protect, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { startDate, endDate, search } = req.query;

    const business = await Business.findById(businessId).lean();
    if (!business) return res.status(404).json({ error: "Business not found" });

    const clientsMap = new Map();

    if (["booking", "mixed"].includes(business.businessType)) {
      const bookings = await Booking.find({ businessId })
        .select("customerName phoneNumber date createdAt")
        .lean();

      for (const b of bookings) {
        const phoneNumber = b.phoneNumber || "";
        if (!phoneNumber) continue;

        const bookingDate = new Date(b.date || b.createdAt);

        if (startDate && bookingDate < new Date(startDate)) continue;
        if (endDate && bookingDate > new Date(endDate)) continue;

        if (search) {
          const q = String(search).toLowerCase();
          const n = String(b.customerName || "").toLowerCase();
          const p = String(phoneNumber || "").toLowerCase();
          if (!n.includes(q) && !p.includes(q)) continue;
        }

        const cur = clientsMap.get(phoneNumber);
        if (!cur) {
          clientsMap.set(phoneNumber, {
            name: b.customerName || "Unknown",
            phoneNumber,
            lastActivity: b.date || b.createdAt,
            visits: 1,
            notes: "",
          });
        } else {
          cur.visits += 1;
          const curDate = new Date(cur.lastActivity);
          if (bookingDate > curDate) cur.lastActivity = b.date || b.createdAt;
          clientsMap.set(phoneNumber, cur);
        }
      }
    }

    const clients = Array.from(clientsMap.values()).sort(
      (a, b) => new Date(b.lastActivity) - new Date(a.lastActivity)
    );

    res.json(clients);
  } catch (err) {
    console.error("❌ Failed to fetch clients:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===========================================
   Get full history for a specific client (phone)
   =========================================== */
router.get("/:businessId/:phoneNumber", protect, async (req, res) => {
  try {
    const { businessId, phoneNumber } = req.params;

    const business = await Business.findById(businessId).lean();
    if (!business) return res.status(404).json({ error: "Business not found" });

    const history = { bookings: [], orders: [] };

    if (["booking", "mixed"].includes(business.businessType)) {
      const bookings = await Booking.find({ businessId, phoneNumber })
        .select("date time status notes serviceId serviceSnapshot createdAt")
        .sort({ date: -1, time: -1 })
        .lean();

      history.bookings = bookings.map((b) => ({
        id: b._id,
        date: b.date || (b.createdAt ? b.createdAt.toISOString().slice(0, 10) : ""),
        time: b.time || "",
        status: b.status || "N/A",
        notes: b.notes || "",
        serviceId: b.serviceId || null,
        serviceSnapshot: b.serviceSnapshot || null, // 👈 keep structured
      }));
    }

    // (Orders section reserved for future)

    res.json(history);
  } catch (err) {
    console.error("❌ Failed to fetch client history:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;