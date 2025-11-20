const moment = require("moment");

// returns array of up to 10 valid days: ["2025-02-15", "2025-02-16", ...]
function getNext10Days(biz) {
  const booking = biz?.config?.booking || {};
  const workingDays = Array.isArray(booking.workingDays) ? booking.workingDays : [];
  const closedDates = biz.closedDates || [];

  const openingTime = booking.openingTime || "09:00";
  const closingTime = booking.closingTime || "18:00";

  const gap = Number(booking.slotGapMinutes || 15);

  const days = [];
  let cursor = moment(); // start from today

  // we need to collect 10 valid days
  while (days.length < 10) {
    const dateStr = cursor.format("YYYY-MM-DD");
    const weekday = cursor.format("dddd"); // Monday, Tuesday...

    // ❌ skip closed dates
    if (closedDates.includes(dateStr)) {
      cursor.add(1, "day");
      continue;
    }

    // ❌ skip non-working days
    if (!workingDays.includes(weekday)) {
      cursor.add(1, "day");
      continue;
    }

    // SPECIAL RULE for TODAY
    if (cursor.isSame(moment(), "day")) {
      // check if still open today
      const now = moment();
      const closingMoment = moment(closingTime, "HH:mm");

      // if now > closing => skip today
      if (now.isAfter(closingMoment)) {
        cursor.add(1, "day");
        continue;
      }

      // check if there are free slots left today
      // (you already have the helper in your booking code: makeDayGrid & getTakenMap)
      // BUT we cannot access DB inside this helper. So the final availability check
      // will be done INSIDE the route before sending the template.
      // For now we mark today as “candidate” and we filter again before sending.

      days.push(dateStr);
      cursor.add(1, "day");
      continue;
    }

    // every other day (future days)
    days.push(dateStr);
    cursor.add(1, "day");
  }

  return days;
}

module.exports = getNext10Days;