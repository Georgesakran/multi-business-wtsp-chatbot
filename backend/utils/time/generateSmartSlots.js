const scoreSlot = require("./slotScoring");

function timeToMinutes(t) {
  if (!t || typeof t !== "string") {
    throw new Error(`Invalid time value: ${t}`);
  }
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) {
    throw new Error(`Invalid time format: ${t}`);
  }
  return h * 60 + m;
}

function minutesToTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function roundUpToStep(min, step) {
  return Math.ceil(min / step) * step;
}

function hasConflict(start, duration, bookings) {
  const end = start + duration;
  return bookings.some(b => {
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
  step = 20,
}) {
  const openMin = timeToMinutes(openingTime);
  const closeMin = timeToMinutes(closingTime);

  // 1️⃣ Normalize bookings and sort
  const bookings = [...existingBookings]
    .filter(b => b?.time && b?.duration)
    .map(b => ({
      start: timeToMinutes(b.time),
      end: timeToMinutes(b.time) + Number(b.duration),
    }))
    .sort((a, b) => a.start - b.start);

  // 2️⃣ Build free gaps between bookings
  const gaps = [];
  let cursor = openMin;

  for (const b of bookings) {
    if (b.start > cursor) {
      gaps.push({ start: cursor, end: b.start });
    }
    cursor = Math.max(cursor, b.end);
  }

  if (cursor < closeMin) {
    gaps.push({ start: cursor, end: closeMin });
  }

  // 3️⃣ Generate slots inside each gap
  const slots = [];

  for (const gap of gaps) {
    const gapSize = gap.end - gap.start;

    // Skip tiny gaps
    if (gapSize < serviceDuration) continue;

    // Exact-fit gap → only one slot
    if (gapSize === serviceDuration) {
      slots.push(gap.start);
      continue;
    }

    // Grid-based slots inside large gap
    let t = roundUpToStep(gap.start, step);

    while (t + serviceDuration <= gap.end) {
      const leftoverBefore = t - gap.start;
      const leftoverAfter = gap.end - (t + serviceDuration);

      // Prevent micro-fragments at start or end
      if ((leftoverBefore > 0 && leftoverBefore < step) || (leftoverAfter > 0 && leftoverAfter < step)) {
        t += step;
        continue;
      }

      // Check for conflict (extra safety)
      if (!hasConflict(t, serviceDuration, existingBookings)) {
        slots.push(t);
      }

      t += step;
    }
  }

  // 4️⃣ Score & sort slots
  const scored = slots.map(min => ({
    time: minutesToTime(min),
    score: scoreSlot({
      slot: minutesToTime(min),
      duration: serviceDuration,
      bookings: existingBookings,
      step,
      openingMin: openMin,
      closingMin: closeMin,
    }),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .map(s => s.time);
};
