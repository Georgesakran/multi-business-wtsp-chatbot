// utils/bookingAvailability.js
const moment = require("moment");
const Business = require("../models/Business");
const Booking = require("../models/Booking");

/**
 * Build the service list for a business to show in the flow.
 * main services (first dropdown) = any bookable service
 * addon services (second dropdown) = also any bookable service (could be same list)
 *
 * We return { id, title } for each service, where title is like:
 * "Gel Polish - 120₪ (45m)"
 */
function buildServiceOptions(business) {
  if (!business || !Array.isArray(business.services)) return [];

  return business.services
    .filter(s => s.isActive && s.bookable)
    .map(s => {
      const priceStr = (s.price != null ? s.price : "").toString();
      const durStr = s.duration ? `${s.duration}m` : "";
      // prefer English name first, fallback to Arabic, then Hebrew
      const name =
        s.name?.en ||
        s.name?.ar ||
        s.name?.he ||
        "Service";

      return {
        id: String(s._id),
        title: `${name}${priceStr ? " - " + priceStr : ""}${durStr ? " ("+durStr+")" : ""}`,
        raw: s, // keep raw so we can snapshot later
      };
    });
}

/**
 * Return N upcoming working days (not closedDates),
 * using business.config.booking.workingDays and closedDates.
 *
 * Output format required by flow:
 *   [{ id: "2025-10-16", title: "Thu 16/10" }, ...]
 */
function buildDateOptions(business, daysAhead = 10) {
  const results = [];

  if (!business?.config?.booking) return results;
  const { workingDays } = business.config.booking || {};
  if (!Array.isArray(workingDays) || workingDays.length === 0) return results;

  const closed = new Set(business.closedDates || []);

  // start from "today"
  let cursor = moment();

  while (results.length < daysAhead) {
    const dayName = cursor.format("dddd"); // e.g. "Monday"
    const yyyyMmDd = cursor.format("YYYY-MM-DD");

    const isWorking = workingDays.includes(dayName);
    const isClosed = closed.has(yyyyMmDd);

    if (isWorking && !isClosed) {
      results.push({
        id: yyyyMmDd,
        title: cursor.format("ddd DD/MM"), // "Thu 16/10"
      });
    }

    cursor.add(1, "day");
  }

  return results;
}

/**
 * For a given date + service duration,
 * build available time slots (HH:mm)
 *
 * We'll:
 * 1. Get opening/closing from business.config.booking
 * 2. Walk in slotGapMinutes increments
 * 3. Check no existing booking blocks that exact slot
 *
 * Flow format:
 *  [{ id: "09:00", title: "09:00" }, ...]
 */
async function buildTimeOptions(business, dateStr, mainServiceDuration, addonServicesDurationArr = []) {
  const out = [];

  if (!business?.config?.booking) return out;

  const {
    openingTime,
    closingTime,
    slotGapMinutes = 15
  } = business.config.booking || {};

  if (!openingTime || !closingTime) return out;

  // total duration = main + sum(addons)
  const totalDuration =
    (parseInt(mainServiceDuration || 0, 10) || 0) +
    addonServicesDurationArr.reduce((sum, d) => sum + (parseInt(d || 0, 10) || 0), 0);

  // build timeline for that date
  const startMoment = moment(`${dateStr}T${openingTime}`, "YYYY-MM-DDTHH:mm");
  const endMoment   = moment(`${dateStr}T${closingTime}`, "YYYY-MM-DDTHH:mm");

  // get all bookings that day
  const bookingsThatDay = await Booking.find({
    businessId: business._id,
    date: dateStr,
    status: { $ne: "cancelled" },
  });

  // helper: does [slotStart, slotEnd) collide with existing bookings?
  function isTaken(slotStart, slotEnd) {
    return bookingsThatDay.some(b => {
      const bStart = moment(`${b.date}T${b.time}`, "YYYY-MM-DDTHH:mm");
      const bEnd = moment(bStart).add(b.serviceSnapshot?.duration || 30, "minutes"); // fallback 30m

      // overlap check
      return slotStart.isBefore(bEnd) && bStart.isBefore(slotEnd);
    });
  }

  let cursor = startMoment.clone();
  while (cursor.isBefore(endMoment)) {
    const slotStart = cursor.clone();
    const slotEnd = cursor.clone().add(totalDuration || 30, "minutes");

    // time must end before closing
    if (slotEnd.isAfter(endMoment)) break;

    if (!isTaken(slotStart, slotEnd)) {
      const label = slotStart.format("HH:mm");
      out.push({
        id: label,
        title: label
      });
    }

    cursor.add(slotGapMinutes, "minutes");
  }

  return out;
}

/**
 * Create a booking in DB after customer confirmed.
 * We pass in all final answers gathered from Flow.
 */
async function createBookingFromFlow({
  business,
  customerPhone,
  customerName,
  notes,
  date,
  time,
  mainServiceId,
  addonServiceIds = [],
}) {

  // find the actual service docs from business.services
  const serviceMap = {};
  for (const s of business.services || []) {
    serviceMap[String(s._id)] = s;
  }

  const mainService = serviceMap[mainServiceId];
  const addonList   = addonServiceIds.map(id => serviceMap[id]).filter(Boolean);

  // snapshot for main service
  const serviceSnapshot = mainService
    ? {
        name: {
          en: mainService.name?.en || "",
          ar: mainService.name?.ar || "",
          he: mainService.name?.he || "",
        },
        price: mainService.price || 0,
        duration: mainService.duration || 0,
      }
    : {
        name: { en: "", ar: "", he: "" },
        price: 0,
        duration: 0,
      };

  // snapshot for addons
  const addonSnapshots = addonList.map(s => ({
    name: {
      en: s.name?.en || "",
      ar: s.name?.ar || "",
      he: s.name?.he || "",
    },
    price: s.price || 0,
    duration: s.duration || 0,
  }));

  // create booking
  const bookingDoc = await Booking.create({
    businessId: business._id,
    customerName: customerName || "Unknown",
    phoneNumber: customerPhone,
    serviceId: mainServiceId || null,
    serviceSnapshot,
    addonServices: addonSnapshots,
    date,
    time,
    notes: notes || "",
    status: "pending",
    source: "whatsapp",
  });

  return bookingDoc;
}

module.exports = {
  buildServiceOptions,
  buildDateOptions,
  buildTimeOptions,
  createBookingFromFlow,
};