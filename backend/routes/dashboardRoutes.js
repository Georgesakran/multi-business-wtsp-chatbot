const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

router.get("/:id/full-overview", protect, async (req, res) => {
  const { id: businessId } = req.params;
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: "Missing from or to date" });
  }

  try {
    const Booking = require("../models/Booking");
    const Message = require("../models/Message");
    //const Order = require("../models/Order");

    const fromDate = new Date(from + "T00:00:00Z");
    const toDate = new Date(to + "T23:59:59Z");

    // 🟦 BOOKINGS
    const bookings = await Booking.find({
      businessId,
      date: { $gte: from, $lte: to },
    });

    const bookingStats = {
      total: bookings.length,
      statusCounts: {},
      sourceCounts: {},
      topClients: {},
      topServices: {},
      mostBookedService: [],
    };

    const clientsMap = {};
    const servicesMap = {};

    bookings.forEach((b) => {
      // Status and source
      bookingStats.statusCounts[b.status] = (bookingStats.statusCounts[b.status] || 0) + 1;
      bookingStats.sourceCounts[b.source] = (bookingStats.sourceCounts[b.source] || 0) + 1;

        // Top clients based on phoneNumber only
      if (b.phoneNumber) {
        clientsMap[b.phoneNumber] = (clientsMap[b.phoneNumber] || 0) + 1;
      }

      // Top services
      const serviceName = b.service?.en || "Unknown";
      servicesMap[serviceName] = (servicesMap[serviceName] || 0) + 1;
    });

    // Final top clients/services
    bookingStats.topClients = Object.entries(clientsMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phoneNumber, count]) => ({ name: phoneNumber, count }));

    bookingStats.topServices = Object.entries(servicesMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    bookingStats.mostBookedService = bookingStats.topServices.length
      ? [bookingStats.topServices[0].name]
      : [];

    // 🟪 ORDERS
    // 🟧 Product Stats
    // const orders = await Order.find({ businessId, createdAt: { $gte: fromDate, $lte: toDate } });

    // const productStats = {
    //   total: orders.length,
    //   statusCounts: {},
    //   sourceCounts: {},
    //   topClients: {},
    //   topServices: {},
    //   topProduct: [],
    // };

    // orders.forEach(o => {
    //   productStats.statusCounts[o.status] = (productStats.statusCounts[o.status] || 0) + 1;
    //   productStats.sourceCounts[o.source] = (productStats.sourceCounts[o.source] || 0) + 1;
    //   if (o.clientName) productStats.topClients[o.clientName] = (productStats.topClients[o.clientName] || 0) + 1;
    //   if (o.productName) productStats.topServices[o.productName] = (productStats.topServices[o.productName] || 0) + 1;
    // });

    // productStats.topClients = Object.entries(productStats.topClients)
    //   .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count }));
    // productStats.topServices = Object.entries(productStats.topServices)
    //   .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count }));
    // productStats.topProduct = productStats.topServices.length ? [productStats.topServices[0].name] : [];





    // 🟩 CHATBOT TIME DISTRIBUTION
    const messages = await Message.find({
      businessId,
      timestamp: { $gte: fromDate, $lte: toDate },
    });

    const timeBuckets = {
      Morning: 0,   // 6–12
      Afternoon: 0, // 12–18
      Evening: 0,   // 18–24
      Night: 0,     // 0–6
    };

    messages.forEach((msg) => {
      const hour = new Date(msg.timestamp).getHours();
      if (hour >= 6 && hour < 13) timeBuckets.Morning++;
      else if (hour >= 13 && hour < 18) timeBuckets.Afternoon++;
      else if (hour >= 18 && hour < 24) timeBuckets.Evening++;
      else timeBuckets.Night++;
    });

    const chatbotTime = {
      total: messages.length,
      timeBuckets,
    };

    // 🟨 WEEKDAY DISTRIBUTION
    const weekdayBookings = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }; // 0 = Sunday
    const weekdayOrders = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    bookings.forEach(b => {
      const d = new Date(b.date);
      const day = d.getDay()+1;
      weekdayBookings[day]++;
    });


    // orders.forEach(o => {
    //   const d = new Date(o.createdAt);
    //   const day = d.getDay();
    //   weekdayOrders[day]++;
    // });

    res.json({
      bookingStats,
      // productStats,
      chatbotTime,
      weekdayBookings,
      weekdayOrders,
    });
  } catch (err) {
    console.error("❌ Full overview fetch failed", err);
    res.status(500).json({ error: "Full dashboard overview failed" });
  }
});

module.exports = router;