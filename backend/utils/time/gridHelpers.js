const { toMinutes, toHHMM } = require("./timeConvert");

function makeDayGrid(openingTime, closingTime, slotGapMinutes) {
  const start = toMinutes(openingTime);
  const end = toMinutes(closingTime);
  const gap = Math.max(5, Number(slotGapMinutes || 15));
  const out = [];

  for (let t = start; t + gap <= end; t += gap) {
    out.push(toHHMM(t));
  }

  return out;
}

module.exports = makeDayGrid;