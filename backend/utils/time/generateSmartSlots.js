// utils/time/generateSmartSlots.js

function timeToMinutes(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }
  
  function minutesToTime(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  
  // round UP to next 20-min anchor
  function roundUpToStep(min, step) {
    return Math.ceil(min / step) * step;
  }
  
  function hasConflict(start, duration, bookings) {
    const end = start + duration;
  
    return bookings.some((b) => {
      const bStart = timeToMinutes(b.time);
      const bEnd = bStart + Number(b.duration || 0);
      return start < bEnd && end > bStart;
    });
  }
  
  module.exports = function generateSmartSlots({
    openingTime,
    closingTime,
    serviceDuration,
    existingBookings = [],
    step = 10, // 🔒 GLOBAL GRID
  }) {
    const openMin = timeToMinutes(openingTime);
    const closeMin = timeToMinutes(closingTime);
  
    let cursor = roundUpToStep(openMin, step);
    const slots = [];
  
    while (cursor + serviceDuration <= closeMin) {
      if (!hasConflict(cursor, serviceDuration, existingBookings)) {
        slots.push(minutesToTime(cursor));
      }
      cursor += step;
    }
  
    return slots;
  };
  