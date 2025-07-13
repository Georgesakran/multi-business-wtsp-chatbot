const express = require("express");
const router = express.Router();
const Business = require("../models/Business");
const Booking = require("../models/Booking");
const Message = require("../models/Message");
const { protect } = require("../middleware/authMiddleware");

// ✅ Booking Overview (filter by date)
router.get('/:id/booking-overview', protect, async (req, res) => {
  const { id: businessId } = req.params;
  const { from, to } = req.query;

  try {
    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ error: "Business not found" });

    const isBookingType = ["booking", "mixed"].includes(business.businessType);
    const isProductType = ["product", "mixed"].includes(business.businessType);

    const statusCounts = {};
    const sourceCounts = {};
    const serviceCounts = {};
    const clientCounts = {};

    let bookings = [];
    let orders = [];

    if (isBookingType) {
      bookings = await Booking.find({
        businessId,
        date: { $gte: from, $lte: to },
      });

      bookings.forEach((booking) => {
        statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1;

        const source = booking.source || "manual";
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;

        const serviceName = booking.service?.en || "Unknown";
        serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1;

        const phone = booking.phoneNumber || "Unknown";
        clientCounts[phone] = (clientCounts[phone] || 0) + 1;
      });
    }

    if (isProductType) {
      const Order = require("../../models/Order"); // ✅ Make sure this model exists
      orders = await Order.find({
        businessId,
        createdAt: {
          $gte: new Date(from + "T00:00:00Z"),
          $lte: new Date(to + "T23:59:59Z"),
        },
      });

      orders.forEach((order) => {
        const status = order.status || "unknown";
        statusCounts[status] = (statusCounts[status] || 0) + 1;

        const source = order.source || "manual";
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;

        const productName = order.product?.name || "Unknown";
        serviceCounts[productName] = (serviceCounts[productName] || 0) + 1;

        const phone = order.phoneNumber || "Unknown";
        clientCounts[phone] = (clientCounts[phone] || 0) + 1;
      });
    }

    const mostBookedService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0] || null;

    const total = isBookingType ? bookings.length : orders.length;

    const topClients = Object.entries(clientCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([phone, count]) => ({
        phone,
        count,
        label: isBookingType ? "bookings" : "orders",
      }));

    const topServices = Object.entries(serviceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        name,
        count,
      }));

    return res.json({
      total,
      statusCounts,
      sourceCounts,
      serviceCounts,
      mostBookedService,
      topClients,
      topServices, // ✅ new field for frontend use
    });
  } catch (err) {
    console.error("❌ Error fetching booking overview", err);
    res.status(500).json({ error: "Failed to fetch booking overview" });
  }
});

router.get("/:id/chatbot-activity", protect, async (req, res) => {
  const { id: businessId } = req.params;
  const { from, to } = req.query;

  try {
    const messages = await Message.find({
      businessId,
      role: "user", // only customer messages
      timestamp: {
        $gte: new Date(from + "T00:00:00Z"),
        $lte: new Date(to + "T23:59:59Z"),
      },
    });

    const timeBuckets = {
      morning: 0,    // 6–12
      afternoon: 0,  // 12–18
      evening: 0,    // 18–24
      night: 0       // 0–6
    };

    messages.forEach((msg) => {
      const hour = new Date(msg.timestamp).getHours(); // ✅ FIXED HERE
      if (hour >= 6 && hour < 12) timeBuckets.morning++;
      else if (hour >= 12 && hour < 18) timeBuckets.afternoon++;
      else if (hour >= 18 && hour < 24) timeBuckets.evening++;
      else timeBuckets.night++;
    });

    const totalMessages = Object.values(timeBuckets).reduce((sum, count) => sum + count, 0);
    if (totalMessages === 0) {
      return res.json({ total: 0, timeBuckets: {} });
    }
    res.json({ total: totalMessages, timeBuckets });
  } catch (err) {
    console.error("Failed to fetch chatbot activity", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;