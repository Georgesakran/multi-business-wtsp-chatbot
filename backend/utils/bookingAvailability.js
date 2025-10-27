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

function buildDateOptions(business, serviceId) {
    const workingDays = business?.config?.booking?.workingDays || [];
    const closedDates = business?.closedDates || [];
    const dates = [];
  
    for (let i = 0; i < 10; i++) {
      const d = moment().add(i, "days");
      const dayName = d.format("dddd");
      const dateStr = d.format("YYYY-MM-DD");
  
      // must be a working day
      if (workingDays.length && !workingDays.includes(dayName)) continue;
      // skip closed dates
      if (closedDates.includes(dateStr)) continue;
  
      dates.push({
        id: dateStr,
        title: `${dayName} ${d.format("DD/MM")}`,
      });
    }
  
    return dates;
  }
  
  /**
   * Build available times for a given date/service.
   */
  async function buildTimeOptions({ business, serviceId, date }) {
    const service = business.services.find(
      (s) => String(s._id) === String(serviceId)
    );
    if (!service) return [];
  
    const duration = service.duration || 30;
    const gap = business?.config?.booking?.slotGapMinutes || 15;
    const opening = business?.config?.booking?.openingTime || "09:00";
    const closing = business?.config?.booking?.closingTime || "18:00";
  
    const start = moment(`${date} ${opening}`, "YYYY-MM-DD HH:mm");
    const end = moment(`${date} ${closing}`, "YYYY-MM-DD HH:mm");
  
    // fetch bookings for that date
    const existing = await Booking.find({
      businessId: business._id,
      date,
      status: { $ne: "cancelled" },
    });
  
    const takenSlots = existing.map((b) => {
      const t1 = moment(`${b.date} ${b.time}`, "YYYY-MM-DD HH:mm");
      const dur = b.serviceSnapshot?.duration || 30;
      const t2 = t1.clone().add(dur, "minutes");
      return [t1, t2];
    });
  
    const times = [];
    let current = start.clone();
  
    while (current.isBefore(end)) {
      const slotStart = current.clone();
      const slotEnd = current.clone().add(duration, "minutes");
  
      if (slotEnd.isAfter(end)) break;
  
      const overlap = takenSlots.some(([bStart, bEnd]) => {
        return slotStart.isBefore(bEnd) && slotEnd.isAfter(bStart);
      });
  
      if (!overlap) {
        times.push({
          id: slotStart.format("HH:mm"),
          title: slotStart.format("HH:mm"),
        });
      }
  
      current.add(gap, "minutes");
    }
  
    return times;
  }
  
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
console.log(2);

module.exports = {
  buildServiceOptions,
  buildDateOptions,
  buildTimeOptions,
  createBookingFromFlow,
};