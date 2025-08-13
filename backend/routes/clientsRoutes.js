// routes/clientsRoutes.js
const express = require("express");
const router = express.Router();
const Business = require("../models/Business");
const Booking = require("../models/Booking");
// const Order = require("../models/Order");
const { protect } = require("../middleware/authMiddleware");

// 📌 Get all clients for a business
router.get("/:businessId", protect, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { startDate, endDate, search } = req.query;

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    let clientsMap = new Map();

    // ✅ Fetch Booking Clients
    if (["booking", "mixed"].includes(business.businessType)) {
      const bookings = await Booking.find({ businessId });

      bookings.forEach(b => {
        const phoneNumber = b.phoneNumber || "";
        if (!phoneNumber) return;

        const bookingDate = new Date(b.date || b.createdAt);

        // ✅ Filter by date range
        if (startDate && bookingDate < new Date(startDate)) return;
        if (endDate && bookingDate > new Date(endDate)) return;

        // ✅ Filter by search query
        if (search) {
          const lowerSearch = search.toLowerCase();
          if (
            !(b.customerName || "").toLowerCase().includes(lowerSearch) &&
            !(phoneNumber || "").toLowerCase().includes(lowerSearch)
          ) {
            return;
          }
        }

        if (!clientsMap.has(phoneNumber)) {
          clientsMap.set(phoneNumber, {
            name: b.customerName || "Unknown",
            phoneNumber,
            lastActivity: b.date || b.createdAt,
            visits: 1,
            notes: ""
          });
        } else {
          const client = clientsMap.get(phoneNumber);
          client.visits += 1;

          const currentActivityDate = new Date(client.lastActivity);
          if (bookingDate > currentActivityDate) {
            client.lastActivity = b.date || b.createdAt;
          }

          clientsMap.set(phoneNumber, client);
        }
      });
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


// 📌 Get full history for a specific client by phone number
router.get("/:businessId/:phoneNumber", protect, async (req, res) => {
  try {
    const { businessId, phoneNumber } = req.params;

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    let history = {
      bookings: [],
      orders: [] // For future use
    };

    // ✅ Booking History
    if (["booking", "mixed"].includes(business.businessType)) {
      const bookings = await Booking.find({
        businessId,
        phoneNumber
      }).sort({ date: -1 });

      history.bookings = bookings.map(b => ({
        id: b._id,
        date: b.date || b.createdAt,
        service: b.service?.en || "N/A",
        status: b.status || "N/A",
        notes: b.notes || ""
      }));
    }

    /*
    // ✅ Product Order History (future use)
    if (["product", "mixed"].includes(business.businessType)) {
      const orders = await Order.find({
        businessId,
        customerPhone: phoneNumber
      }).sort({ createdAt: -1 });

      history.orders = orders.map(o => ({
        id: o._id,
        date: o.createdAt,
        items: o.items || [],
        total: o.total || 0,
        status: o.status || "N/A"
      }));
    }
    */

    res.json(history);
  } catch (err) {
    console.error("❌ Failed to fetch client history:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
