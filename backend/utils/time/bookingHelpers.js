const Booking = require("../../models/Booking");
const moment = require("moment");
const makeDayGrid = require("./gridHelpers"); // your makeDayGrid helper

// ------------------------- helper functions -------------------------

/**
 * Returns how many slots are needed to cover a service duration
 */
async function slotsNeeded(duration, slotGapMinutes) {
  const gap = Math.max(5, Number(slotGapMinutes || 15));
  return Math.max(1, Math.ceil(Number(duration || 0) / gap));
}

/**
 * Finds a service by ID in business.services
 */
async function findServiceById(biz, serviceId) {
  if (!serviceId) return null;
  return (biz.services || []).find((s) => s._id.toString() === serviceId.toString());
}

/**
 * Returns a map of taken slots for a given business & date
 */
async function getTakenMap(businessId, date) {
  const bookings = await Booking.find({
    businessId,
    date,
    status: { $in: ["confirmed", "in-progress"] },
  });
  console.log("bookings in getTakenMap :"+bookings);

  return bookings.map((b) => ({
    start: b.time,
    end: getEndTime(b.time, b.serviceSnapshot.duration),
  }));
}
function getEndTime(startTime, duration) {
  const [h, m] = startTime.split(":").map(Number);
  const end = new Date();
  end.setHours(h);
  end.setMinutes(m + duration);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(end.getHours())}:${pad(end.getMinutes())}`;
}


/**
 * Checks if a range of consecutive slots is free
 */
async function isRangeFree(dayGrid, takenMap, startIndex, need) {
  for (let i = 0; i < need; i++) {
    const t = dayGrid[startIndex + i];
    if (!t || takenMap.get(t)) return false;
  }
  return true;
}

// ------------------------- main helper -------------------------

/**
 * Returns all free slots for today (or the given date)
 * Example: returns ["09:00", "09:30", "10:00", ...]
 */
async function checkFreeSlotsToday(biz, date = moment().format("YYYY-MM-DD")) {
  if (!biz || !biz.openingTime || !biz.closingTime) return [];

  const dayGrid = makeDayGrid(biz.openingTime, biz.closingTime, biz.slotGapMinutes);
  const takenMap = await getTakenMap(biz._id, date);

  // Filter only slots that are free
  return dayGrid.filter((_, idx) => isRangeFree(dayGrid, takenMap, idx, 1));
}


/**
 * Converts "YYYY-MM-DD" → weekday name in English
 * Example: "2025-12-05" → "Friday"
 */
function weekdayFromISO(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" });
}



// ------------------------- exports -------------------------

module.exports = {
  checkFreeSlotsToday,
  slotsNeeded,
  findServiceById,
  getTakenMap,
  isRangeFree,
  weekdayFromISO,
};
