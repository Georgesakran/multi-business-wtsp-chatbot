const ConversationState = require('../models/ConversationState');
const Booking = require('../models/Booking');
const { sendMessage } = require('../utils/sendMessage');

async function handleBookingFlow(req, res, state, text, from, business) {
  const services = business.services || [];

  switch (state.step) {
    case 'selectService': {
      const serviceIndex = parseInt(text) - 1;
      if (serviceIndex < 0 || serviceIndex >= services.length || isNaN(serviceIndex)) {
        await sendMessage(from, "Invalid service selection. Please enter the number corresponding to the service.", business);
        return res.sendStatus(200);
      }

      state.data.selectedService = services[serviceIndex];
      state.step = 'selectDay';
      await state.save();

      await sendMessage(from, "Great choice! Please enter the day you want to book (e.g., Monday, Tuesday, or date in YYYY-MM-DD):", business);
      return res.sendStatus(200);
    }

    case 'selectDay': {
      const requestedDay = text.trim();
      state.data.selectedDay = requestedDay;
      await state.save();

      const possibleTimes = state.data.selectedService.availableTimes || [];

      // Find already booked times for this business, service, and day
      const bookedSlots = await Booking.find({
        businessId: business._id,
        service: state.data.selectedService.name,
        day: requestedDay,
        status: { $in: ['pending', 'confirmed'] }
      }).select('time').lean();

      const bookedTimes = bookedSlots.map(b => b.time);
      const freeTimes = possibleTimes.filter(t => !bookedTimes.includes(t));

      if (freeTimes.length === 0) {
        await sendMessage(from, `Sorry, no available time slots on ${requestedDay}. Please choose another day.`, business);
        return res.sendStatus(200);
      }

      let msg = `Available time slots on ${requestedDay}:\n`;
      freeTimes.forEach((time, idx) => {
        msg += `${idx + 1}. ${time}\n`;
      });

      await sendMessage(from, msg, business);

      state.data.freeTimes = freeTimes;
      state.step = 'selectTime';
      await state.save();

      return res.sendStatus(200);
    }

    case 'selectTime': {
      const timeChoice = parseInt(text) - 1;
      const freeTimes = state.data.freeTimes || [];

      if (timeChoice < 0 || timeChoice >= freeTimes.length || isNaN(timeChoice)) {
        await sendMessage(from, "Invalid time selection. Please enter the number corresponding to the available time.", business);
        return res.sendStatus(200);
      }

      const selectedTime = freeTimes[timeChoice];
      const selectedService = state.data.selectedService.name;
      const selectedDay = state.data.selectedDay;

      // Save booking
      await Booking.create({
        businessId: business._id,
        customerPhone: from,
        service: selectedService,
        day: selectedDay,
        time: selectedTime,
        status: 'pending',
        createdAt: new Date(),
      });

      // Clear state or reset to default for next conversation
      state.step = 'menu';
      state.mode = 'gpt';
      state.data = {};
      await state.save();

      await sendMessage(from, `✅ Your booking for ${selectedService} on ${selectedDay} at ${selectedTime} is confirmed. Thank you!`, business);
      return res.sendStatus(200);
    }

    default: {
      state.step = 'menu';
      state.mode = 'gpt';
      state.data = {};
      await state.save();

      await sendMessage(from, "Booking flow reset. How can I assist you today?", business);
      return res.sendStatus(200);
    }
  }
}

module.exports = handleBookingFlow;
