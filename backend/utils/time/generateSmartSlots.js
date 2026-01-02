const moment = require("moment");

/**
 * Generate smart slots for a service
 * No gaps smaller than service duration
 */
function generateSmartSlots({
  openingTime,
  closingTime,
  serviceDuration, // in minutes
  existingBookings = [], // [{start:"09:00", end:"09:20"}]
  gap = 0, // optional gap between bookings
}) {
  const slots = [];
  const fmt = "HH:mm";

  let start = moment(openingTime, fmt);
  const endOfDay = moment(closingTime, fmt);

  // sort existing bookings
  const bookings = existingBookings
    .map((b) => ({
      start: moment(b.start, fmt),
      end: moment(b.end, fmt),
    }))
    .sort((a, b) => a.start - b.start);

  while (start.clone().add(serviceDuration, "minutes").isSameOrBefore(endOfDay)) {
    const potentialEnd = start.clone().add(serviceDuration, "minutes");

    const overlap = bookings.some(
      (b) => potentialEnd.isAfter(b.start) && start.isBefore(b.end)
    );

    if (!overlap) {
      slots.push(start.format(fmt));
      start.add(serviceDuration + gap, "minutes");
    } else {
      const nextBooking = bookings.find(
        (b) => potentialEnd.isAfter(b.start) && start.isBefore(b.end)
      );
      start = nextBooking.end.clone().add(gap, "minutes");
    }
  }

  return slots;
}

module.exports = generateSmartSlots;
