const moment = require("moment");

/**
 * Generate smart slots for a service
 * No gaps smaller than service duration
 */
function generateSmartSlots({ openingTime, closingTime, serviceDuration, existingBookings }) {
    const slots = [];
    let current = openingTime;
  
    while (current <= closingTime) {
      const slotEnd = addMinutes(current, serviceDuration);
      // check overlap with existing bookings
      const overlap = existingBookings.some(
        (b) => !(slotEnd <= b.start || current >= b.end)
      );
      if (!overlap && slotEnd <= closingTime) {
        slots.push(current);
      }
      current = addMinutes(current, 10); // 10 min increments
    }
    return slots;
  }
  
  // helper
  function addMinutes(timeStr, mins) {
    const [h, m] = timeStr.split(":").map(Number);
    let total = h * 60 + m + mins;
    const hh = Math.floor(total / 60).toString().padStart(2, "0");
    const mm = (total % 60).toString().padStart(2, "0");
    return `${hh}:${mm}`;
  }
  
module.exports = generateSmartSlots;
