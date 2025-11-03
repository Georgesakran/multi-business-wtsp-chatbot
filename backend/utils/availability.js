// utils/availability.js
const Booking = require("../models/Booking");
const dayjs = require("dayjs");

const WEEKDAY = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function toTitle(d, locale="en") {
  const dx = dayjs(d);
  const wd = WEEKDAY[dx.day()];
  return `${wd} ${dx.format("DD/MM")}`;
}

function* dateRange(start, days=14) {
  let s = dayjs(start).startOf("day");
  for (let i=0;i<days;i++) yield s.add(i, "day");
}

function withinWorkingDay(biz, d) {
  const dayName = WEEKDAY[dayjs(d).day()];
  const wd = biz?.config?.booking?.workingDays || [];
  return wd.includes(dayName);
}

async function getDateOptions(business, serviceId, daysAhead=14) {
  const closed = new Set((business.closedDates||[]));
  const out = [];
  for (const d of dateRange(dayjs(), daysAhead)) {
    const iso = d.format("YYYY-MM-DD");
    if (closed.has(iso)) continue;
    if (!withinWorkingDay(business, iso)) continue;
    out.push({ id: iso, title: toTitle(iso) });
    if (out.length >= 9) break; // show up to 9 days
  }
  return out;
}

function periodBuckets() {
  return [
    { id: "MORNING",   title: "Morning (09:00–12:00)",  start: "09:00", end: "12:00" },
    { id: "AFTERNOON", title: "Afternoon (12:00–16:00)",start: "12:00", end: "16:00" },
    { id: "EVENING",   title: "Evening (16:00–18:00)",  start: "16:00", end: "18:00" },
  ];
}

function* timeSlots(start, end, stepMin=15) {
  let t = dayjs(`1970-01-01T${start}:00`);
  const e = dayjs(`1970-01-01T${end}:00`);
  while (t.isBefore(e)) {
    yield t.format("HH:mm");
    t = t.add(stepMin, "minute");
  }
}

async function getTimeOptions({ business, service, date, period }) {
  const step = business?.config?.booking?.slotGapMinutes || 15;
  const p = periodBuckets().find(x => x.id === period);
  if (!p) return [];

  const duration = service?.duration || 30;
  const taken = await Booking.find({ businessId: business._id, date, status: { $in: ["pending","confirmed"] } })
                             .select("time serviceSnapshot.duration").lean();

  const isFree = (startHHmm) => {
    const start = dayjs(`1970-01-01T${startHHmm}:00`);
    const end   = start.add(duration, "minute");
    for (const b of taken) {
      const bs = dayjs(`1970-01-01T${b.time}:00`);
      const be = bs.add((b.serviceSnapshot?.duration||duration), "minute");
      const overlap = start.isBefore(be) && end.isAfter(bs);
      if (overlap) return false;
    }
    return true;
  };

  const list = [];
  for (const hhmm of timeSlots(p.start, p.end, step)) {
    if (isFree(hhmm)) list.push({ id: hhmm, title: hhmm });
  }
  return list;
}

module.exports = {
  getDateOptions,
  getTimeOptions,
  periodBuckets
};