const timeToMinutes = t => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  
  module.exports = function scoreSlot({
    slot,
    duration,
    bookings,
    step,
    openingMin,
    closingMin
  }) {
    const start = timeToMinutes(slot);
    const end = start + duration;
    let score = 0;
  
    for (const b of bookings) {
      const bStart = timeToMinutes(b.time);
      const bEnd = bStart + Number(b.duration || 0);
  
      // exact fit before or after
      if (start === bEnd || end === bStart) {
        score += 40;
      }
  
      // creates tiny gap
      const gapBefore = start - bEnd;
      const gapAfter = bStart - end;
      if (gapBefore > 0 && gapBefore < step) score -= 50;
      if (gapAfter > 0 && gapAfter < step) score -= 50;
    }
  
    // exact gap fit (gold)
    if (
      bookings.some(b => {
        const bStart = timeToMinutes(b.time);
        const bEnd = bStart + Number(b.duration || 0);
        return start === bEnd && end === bStart;
      })
    ) {
      score += 100;
    }
  
    // bounds safety
    if (start < openingMin || end > closingMin) score -= 100;
  
    return score;
  };
  