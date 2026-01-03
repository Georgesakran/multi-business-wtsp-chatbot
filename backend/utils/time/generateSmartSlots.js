function toMinutes(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }
  
  function toTime(mins) {
    const h = Math.floor(mins / 60).toString().padStart(2, "0");
    const m = (mins % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  }
  
  module.exports = function generateSmartSlots({
    openingTime,
    closingTime,
    serviceDuration,
    existingBookings,
    step = 10,          // minutes grid
    minGap = 20,        // shortest service (X)
  }) {
    const open = toMinutes(openingTime);
    const close = toMinutes(closingTime);
  
    // Normalize bookings
    const bookings = existingBookings.map(b => ({
      start: toMinutes(b.start),
      end: toMinutes(b.end),
    }));
  
    const slots = [];
  
    for (let t = open; t + serviceDuration <= close; t += step) {
      const slotEnd = t + serviceDuration;
  
      // 1️⃣ No overlap
      const overlaps = bookings.some(
        b => !(slotEnd <= b.start || t >= b.end)
      );
      if (overlaps) continue;
  
      // 2️⃣ Find next booking
      const nextBooking = bookings
        .filter(b => b.start >= slotEnd)
        .sort((a, b) => a.start - b.start)[0];
  
      // 3️⃣ Prevent dead gaps
      if (nextBooking) {
        const gap = nextBooking.start - slotEnd;
        if (gap > 0 && gap < minGap) continue;
      }
  
      slots.push(toTime(t));
    }
  
    return slots;
  };
  