// 📂 routes/bookingsRoutes.js
const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');

// استرجاع جميع الحجوزات لبزنس معين
router.get('/:businessId', async (req, res) => {
  try {
    const bookings = await Booking.find({ businessId: req.params.businessId }).sort({ date: 1, hour: 1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;