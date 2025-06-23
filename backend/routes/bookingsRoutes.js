const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Service = require('../models/Service');

// Check dynamic availability for a given service on a given day
router.post('/check-availability', async (req, res) => {
  try {
    const { businessId, serviceName, bookingDate } = req.body;

    // Find the service to get available slots
    const service = await Service.findOne({ businessId, serviceName });
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Find booked times on that day
    const bookings = await Booking.find({ businessId, serviceName, bookingDate });
    const bookedTimes = bookings.map(b => b.bookingTime);

    // Filter free slots
    const freeSlots = service.availableSlots.filter(slot => !bookedTimes.includes(slot));

    res.json({ availableTimes: freeSlots });
  } catch (error) {
    console.error('Check Availability Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



// Create a new booking
router.post('/', async (req, res) => {
    try {
      const { businessId, serviceName, customerPhone, bookingDate, bookingTime } = req.body;
  
      // Check if the time slot is already booked
      const existingBooking = await Booking.findOne({ businessId, serviceName, bookingDate, bookingTime });
      if (existingBooking) {
        return res.status(400).json({ error: 'This time slot is already booked. Please select another time.' });
      }
  
      // Create and save the new booking
      const newBooking = new Booking({
        businessId,
        serviceName,
        customerPhone,
        bookingDate,
        bookingTime,
        status: 'pending', // default status
      });
  
      await newBooking.save();
  
      res.json({ message: 'Booking confirmed!', booking: newBooking });
    } catch (error) {
      console.error('Create Booking Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
module.exports = router;
