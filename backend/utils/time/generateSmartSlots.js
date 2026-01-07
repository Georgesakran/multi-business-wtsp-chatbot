const scoreSlot = require("./slotScoring");

/**
 * Convert "HH:mm" → minutes from midnight
 */
function timeToMinutes(time) {
  if (!time || typeof time !== "string") {
    throw new Error(`Invalid time value: ${time}`);
  }

  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) {
    throw new Error(`Invalid time format: ${time}`);
  }

  return h * 60 + m;
}

/**
 * Convert minutes → "HH:mm"
 */
function minutesToTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Round minutes UP to the nearest step (e.g. 20 min grid)
 */
function roundUpToStep(min, step) {
  return Math.ceil(min / step) * step;
}

/**
 * Check if a slot conflicts with any normalized booking
 */
function hasConflict(start, duration, bookings) {
  const end = start + duration;
  return bookings.some(b => start < b.end && end > b.start);
}

/**
 * Generate smart available booking slots
 */
module.exports = function generateSmartSlots({
  openingTime,
  closingTime,
  serviceDuration,
  existingBookings = [],
  step = 20,
}) {
  // -----------------------------
  // 0️⃣ Basic validation
  // -----------------------------
  if (!openingTime || !closingTime) {
    throw new Error("Opening or closing time is missing");
  }

  if (!serviceDuration || isNaN(serviceDuration)) {
    throw new Error("Invalid service duration");
  }

  const openingMin = timeToMinutes(openingTime);
  const closingMin = timeToMinutes(closingTime);

  // -----------------------------
  // 1️⃣ Normalize existing bookings
  // -----------------------------
  const bookings = existingBookings
    .filter(b => b?.time && b?.duration)
    .map(b => {
      const start = timeToMinutes(b.time);
      return {
        start,
        end: start + Number(b.duration),
      };
    })
    .sort((a, b) => a.start - b.start);

  // -----------------------------
  // 2️⃣ Find free gaps between bookings
  // -----------------------------
  const gaps = [];
  let cursor = openingMin;

  for (const booking of bookings) {
    if (booking.start > cursor) {
      gaps.push({
        start: cursor,
        end: booking.start,
      });
    }
    cursor = Math.max(cursor, booking.end);
  }

  if (cursor < closingMin) {
    gaps.push({
      start: cursor,
      end: closingMin,
    });
  }

  // -----------------------------
  // 3️⃣ Generate valid slots inside gaps
  // -----------------------------
  const slotMinutes = [];

  for (const gap of gaps) {
    const gapSize = gap.end - gap.start;

    // Too small → skip
    if (gapSize < serviceDuration) continue;

    // Perfect fit → one slot
    if (gapSize === serviceDuration) {
      slotMinutes.push(gap.start);
      continue;
    }

    // Grid-based slots
    let t = roundUpToStep(gap.start, step);

    while (t + serviceDuration <= gap.end) {
      const leftoverBefore = t - gap.start;
      const leftoverAfter = gap.end - (t + serviceDuration);

      // Avoid tiny unusable fragments
      if (
        (leftoverBefore > 0 && leftoverBefore < step) ||
        (leftoverAfter > 0 && leftoverAfter < step)
      ) {
        t += step;
        continue;
      }

      if (!hasConflict(t, serviceDuration, bookings)) {
        slotMinutes.push(t);
      }

      t += step;
    }
  }

  // -----------------------------
// 4️⃣ Score slots
// -----------------------------
const scoredSlots = slotMinutes.map(min => {
    const time = minutesToTime(min);
    return {
      min,
      time,
      score: scoreSlot({
        slot: time,
        duration: serviceDuration,
        bookings: existingBookings,
        step,
        openingMin,
        closingMin,
      }),
    };
  });
  
  // -----------------------------
  // 5️⃣ Rank by score, then return time-sorted slots
  // -----------------------------
//   scoredSlots.sort((a, b) => b.score - a.score);
  
  return scoredSlots.sort((a, b) => a.min - b.min); // chronological

};