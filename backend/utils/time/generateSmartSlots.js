const scoreSlot = require("./slotScoring");

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
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

// 🔥 MAIN FUNCTION
module.exports = function generateSmartSlots({
  openingTime,
  closingTime,
  serviceDuration,
  existingBookings = [],
  step = 20,
}) {
  const openMin = timeToMinutes(openingTime);
  const closeMin = timeToMinutes(closingTime);

  const bookings = [...existingBookings]
    .map(b => ({
      start: timeToMinutes(b.time),
      end: timeToMinutes(b.time) + Number(b.duration || 0),
    }))
    .sort((a, b) => a.start - b.start);

  const gaps = [];
  let cursor = openMin;

  // 1️⃣ Build all free gaps
  for (const b of bookings) {
    if (b.start > cursor) {
      gaps.push({ start: cursor, end: b.start });
    }
    cursor = Math.max(cursor, b.end);
  }

  if (cursor < closeMin) {
    gaps.push({ start: cursor, end: closeMin });
  }

  const slots = [];

  // 2️⃣ Generate slots per gap
  for (const gap of gaps) {
    const gapSize = gap.end - gap.start;

    // ❌ gap too small
    if (gapSize < serviceDuration) continue;

    // ⭐ exact-fit gap → ONLY ONE SLOT
    if (gapSize === serviceDuration) {
      slots.push(gap.start);
      continue;
    }

    // ✅ large gap → controlled grid
    let t = roundUpToStep(gap.start, step);

    while (t + serviceDuration <= gap.end) {
      const leftoverBefore = t - gap.start;
      const leftoverAfter = gap.end - (t + serviceDuration);

      // 🚫 prevent micro-fragments
      if (
        (leftoverBefore > 0 && leftoverBefore < step) ||
        (leftoverAfter > 0 && leftoverAfter < step)
      ) {
        t += step;
        continue;
      }

      slots.push(t);
      t += step;
    }
  }

  // 3️⃣ Score & rank
  const scored = slots.map(min => ({
    time: minutesToTime(min),
    score: scoreSlot({
      slot: minutesToTime(min),
      duration: serviceDuration,
      bookings: existingBookings,
      step,
      openingMin: openMin,
      closingMin: closeMin,
    })
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .map(s => s.time);
};
