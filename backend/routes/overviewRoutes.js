const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const Booking = require("../models/Booking");
const Business = require("../models/Business");
//const Product = require("../models/Product");
//const Order = require("../models/Order");

router.get("/:businessId/week-summary", protect, async (req, res) => {
  const { businessId } = req.params;

  const today = new Date();
  const next7Dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  try {
    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ error: "Business not found" });

    const response = {
      businessName: {
        en: business.nameEnglish || "",
        ar: business.nameArabic || "",
        he: business.nameHebrew || ""
      }
    };

    // 👉 Booking Overview (for booking or mixed)
    if (["booking", "mixed"].includes(business.businessType)) {
      const bookings = await Booking.find({
        businessId,
        date: { $in: next7Dates },
      });

      const days = {};
      for (let dateStr of next7Dates) {
        const d = new Date(dateStr);
        const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
        const isOff = !business.config?.booking?.workingDays?.includes(weekday);

        const open = isOff ? null : business.config?.booking?.openingTime || null;
        const close = isOff ? null : business.config?.booking?.closingTime || null;

        const dayBookings = bookings
          .filter(b => b.date === dateStr && b.status !== "cancelled")
          .sort((a, b) => a.time.localeCompare(b.time));

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
          bookings: dayBookings,
        };
      }

      response.days = days;
    }

    // 👉 Product Overview (for product or mixed)
    // if (["product", "mixed"].includes(business.businessType)) {
    //   const allProducts = await Product.find({ businessId });

    //   const inventoryAlerts = {
    //     lowStock: allProducts.filter(p => p.quantity > 0 && p.quantity < 5),
    //     outOfStock: allProducts.filter(p => p.quantity === 0),
    //   };

    //   const fromDate = new Date();
    //   fromDate.setDate(today.getDate() - 5);
    //   fromDate.setHours(0, 0, 0, 0);

      // const recentOrders = await Order.find({
      //   businessId,
      //   createdAt: { $gte: fromDate },
      // });

      // const ordersByDate = {};
      // for (let order of recentOrders) {
      //   const dateStr = new Date(order.createdAt).toISOString().split("T")[0];
      //   if (!ordersByDate[dateStr]) ordersByDate[dateStr] = [];
      //   ordersByDate[dateStr].push(order);
      // }

      // response.productOverview = {
      //   inventoryAlerts,
      //   ordersByDate
      // };
    //}

    res.json(response);

  } catch (err) {
    console.error("❌ Failed to get overview", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;