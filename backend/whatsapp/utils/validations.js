// utils/validations.js

const { isDate, isTime } = require("./parsing");

/**
 * Validate booking date:
 * - correct format
 * - not closed
 * - within working days
 */
function validateBookingDate(date, biz) {
  if (!isDate(date)) return { ok: false, reason: "invalid_format" };

  if ((biz.closedDates || []).includes(date)) {
    return { ok: false, reason: "closed_day" };
  }

  const workingDays = biz.config?.booking?.workingDays || [];
  const weekday = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
  });

  if (!workingDays.includes(weekday)) {
    return { ok: false, reason: "not_working_day" };
  }

  return { ok: true };
}

/**
 * Validate booking time inside working hours
 */
function validateTimeSlot(time, biz) {
  if (!isTime(time)) return { ok: false, reason: "invalid_format" };

  const { openingTime = "09:00", closingTime = "18:00" } =
    biz.config?.booking || {};

  if (time < openingTime || time > closingTime) {
    return { ok: false, reason: "outside_hours" };
  }

  return { ok: true };
}

module.exports = {
  validateBookingDate,
  validateTimeSlot
};