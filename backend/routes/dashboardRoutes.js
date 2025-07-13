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

// ✅ Chatbot Analytics (unchanged)
router.get("/:id/analytics", protect, async (req, res) => {
  try {
    const businessId = req.params.id;
    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ error: "Business not found" });

    const messages = await Message.find({ businessId });
    const totalMessages = messages.length;

    const customerInteractions = new Set(
      messages.filter((m) => m.role === "user").map((m) => m.customerId)
    ).size;

    const openWindow = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const openConversations = new Set(
      messages.filter((m) => m.role === "user" && m.timestamp >= openWindow).map((m) => m.customerId)
    ).size;

    const questionCounts = {};
    messages.forEach((m) => {
      if (m.role === "user") {
        const text = m.content.toLowerCase().trim();
        questionCounts[text] = (questionCounts[text] || 0) + 1;
      }
    });

    const faqTrends = Object.entries(questionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((entry) => entry[0]);

    const suggestions = [];
    const unanswered = messages.filter(m => m.role === 'user').length - messages.filter(m => m.role === 'assistant').length;
    if (unanswered > 5) suggestions.push("You have many unanswered messages.");
    if (faqTrends[0]) suggestions.push(`The question "${faqTrends[0]}" is common. Add to FAQ.`);

    res.json({
      businessInfo: {
        name: business.nameEnglish || business.nameArabic || business.nameHebrew,
        type: business.businessType,
        language: business.language,
        whatsappNumber: business.whatsappNumber,
      },
      chatbotStats: {
        totalMessages,
        customerInteractions,
        openConversations,
        faqTrends,
        suggestions: suggestions.length ? suggestions : ["Chatbot is running well."],
      },
    });
  } catch (err) {
    console.error("❌ Analytics error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// ✅ Upcoming Bookings
router.get("/:id/upcoming", protect, async (req, res) => {
  try {
    const businessId = req.params.id;
    const today = new Date().toISOString().split("T")[0];

    const upcoming = await Booking.find({
      businessId,
      date: { $gte: today },
    }).sort({ date: 1 }).limit(5);

    res.json(upcoming);
  } catch (err) {
    console.error("❌ Error fetching upcoming bookings", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;