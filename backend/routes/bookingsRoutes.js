// routes/bookingsRoutes.js
const express = require("express");
const router = express.Router();

const Booking = require("../models/Booking");
const Business = require("../models/Business");
const { protect } = require("../middleware/authMiddleware");

/* --------------------------------
   Utils
----------------------------------*/
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const isTime = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s || ""));
const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
};
const toHHMM = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};
const weekdayFromISO = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" });

function makeDayGrid(openingTime, closingTime, slotGapMinutes) {
  const start = toMinutes(openingTime);
  const end = toMinutes(closingTime);
  const gap = Math.max(5, Number(slotGapMinutes || 15));
  const out = [];
  for (let t = start; t + gap <= end; t += gap) out.push(toHHMM(t));
  return out;
}
function slotsNeeded(duration, slotGapMinutes) {
  const gap = Math.max(5, Number(slotGapMinutes || 15));
  return Math.max(1, Math.ceil(Number(duration || 0) / gap));
}
function findServiceById(biz, serviceId) {
  if (!serviceId) return null;
  const sid = String(serviceId);
  return (biz.services || []).find((s) => String(s._id) === sid) || null;
}
async function getTakenMap(businessId, date) {
  const sameDay = await Booking.find({
    businessId,
    date,
    status: { $in: ["pending", "confirmed"] },
  })
    .select("time status")
    .lean();

  const map = new Map();
  for (const b of sameDay) {
    if (isTime(b.time)) map.set(b.time, true);
  }
  return map;
}
function isRangeFree(dayGrid, takenMap, startIndex, need) {
  for (let i = 0; i < need; i++) {
    const t = dayGrid[startIndex + i];
    if (!t || takenMap.get(t)) return false;
  }
  return true;
}

/* --------------------------------
   Availability
   GET /api/bookings/:businessId/availability?date=YYYY-MM-DD&serviceId=<id>
----------------------------------*/
router.get("/:businessId/availability", protect, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { date, serviceId } = req.query;

    if (!isDate(date)) {
      return res.status(400).json({ error: 'date must be "YYYY-MM-DD"' });
    }

    const biz = await Business.findById(businessId).lean();
    if (!biz) return res.status(404).json({ error: "Business not found" });
    if (!biz.enabledServices?.includes("bookingFlow")) {
      return res.status(403).json({ error: "This business does not support bookings" });
    }

    const cfg = biz.config?.booking || {};
    const workingDays = Array.isArray(cfg.workingDays) ? cfg.workingDays : [];
    const openingTime = cfg.openingTime || "09:00";
    const closingTime = cfg.closingTime || "18:00";
    const gap = Number(cfg.slotGapMinutes || 15);

    if ((biz.closedDates || []).includes(date)) {
      return res.json({ date, slots: [], reason: "closed_date" });
    }

    const weekday = weekdayFromISO(date);
    if (!workingDays.includes(weekday)) {
      return res.json({ date, slots: [], reason: "non_working_day" });
    }

    const grid = makeDayGrid(openingTime, closingTime, gap);
    const taken = await getTakenMap(businessId, date);

    // service duration → contiguous slots required
    let need = 1;
    let service = null;
    if (serviceId) {
      service = findServiceById(biz, serviceId);
      if (!service) return res.status(404).json({ error: "Service not found" });
      if (service.bookable && service.duration) {
        need = slotsNeeded(Number(service.duration), gap);
      }
    }

    const free = [];
    for (let i = 0; i < grid.length; i++) {
      if (isRangeFree(grid, taken, i, need)) free.push(grid[i]);
    }

    return res.json({
      date,
      serviceId: serviceId || null,
      durationMinutes: service?.duration || null,
      slotGapMinutes: gap,
      openingTime,
      closingTime,
      slots: free,
    });
  } catch (err) {
    console.error("❌ availability error:", err);
    res.status(500).json({ error: "Server error computing availability" });
  }
});

/* --------------------------------
   List bookings
   GET /api/bookings/:businessId?date=YYYY-MM-DD&status=pending|confirmed|cancelled
----------------------------------*/
router.get("/:businessId", protect, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { date, status } = req.query;

    const biz = await Business.findById(businessId);
    if (!biz || !biz.enabledServices?.includes("bookingFlow")) {
      return res.status(403).json({ error: "This business does not support bookings" });
    }

    const filter = { businessId };
    if (date && isDate(date)) filter.date = date;
    if (status && ["pending", "confirmed", "cancelled"].includes(status)) {
      filter.status = status;
    }

    const bookings = await Booking.find(filter).sort({ date: 1, time: 1 });
    res.json(bookings);
  } catch (err) {
    console.error("❌ Failed to get bookings:", err.message);
    res.status(500).json({ error: "Server error fetching bookings" });
  }
});

/* --------------------------------
   Create booking (manual)
   POST /api/bookings
----------------------------------*/
router.post("/", protect, async (req, res) => {
  try {
    const {
      businessId,
      customerName,
      phoneNumber,
      serviceId,         // preferred
      service,           // optional fallback: { en, ar, he } or stringified
      date,              // "YYYY-MM-DD"
      time,              // "HH:mm"
      status,
      notes,
      staffId,
    } = req.body;

    if (!businessId) return res.status(400).json({ error: "Missing businessId" });
    if (!customerName) return res.status(400).json({ error: "Missing customerName" });
    if (!phoneNumber) return res.status(400).json({ error: "Missing phoneNumber" });
    if (!isDate(date)) return res.status(400).json({ error: 'date must be "YYYY-MM-DD"' });
    if (!isTime(time)) return res.status(400).json({ error: 'time must be "HH:mm"' });

    const biz = await Business.findById(businessId);
    if (!biz) return res.status(404).json({ error: "Business not found" });
    if (!biz.enabledServices?.includes("bookingFlow")) {
      return res.status(403).json({ error: "This business does not support bookings" });
    }

    // Working constraints
    const cfg = biz.config?.booking || {};
    const workingDays = Array.isArray(cfg.workingDays) ? cfg.workingDays : [];
    const weekday = weekdayFromISO(date);
    if ((biz.closedDates || []).includes(date)) {
      return res.status(400).json({ error: "Business is closed on that date" });
    }
    if (!workingDays.includes(weekday)) {
      return res.status(400).json({ error: "Selected date is not a working day" });
    }

    const openingTime = cfg.openingTime || "09:00";
    const closingTime = cfg.closingTime || "18:00";
    const gap = Number(cfg.slotGapMinutes || 15);
    const grid = makeDayGrid(openingTime, closingTime, gap);
    const startIdx = grid.indexOf(time);
    if (startIdx === -1) {
      return res.status(400).json({ error: "Time is outside working hours or not aligned to slot gap" });
    }

    // Resolve snapshot
    let snapshot = { name: { en: "", ar: "", he: "" }, price: 0, duration: 0 };
    let need = 1;

    if (serviceId) {
      const svc = findServiceById(biz, serviceId);
      if (!svc) return res.status(404).json({ error: "Service not found" });
      snapshot = {
        name: {
          en: svc.name?.en || "",
          ar: svc.name?.ar || "",
          he: svc.name?.he || "",
        },
        price: Number(svc.price || 0),
        duration: Number(svc.duration || 0),
      };
      if (svc.bookable && svc.duration) need = slotsNeeded(snapshot.duration, gap);
    } else if (service) {
      // Accept UI fallback: object or string JSON
      let obj = service;
      if (typeof service === "string") {
        try { obj = JSON.parse(service); } catch {}
      }
      snapshot.name = {
        en: obj?.en || "",
        ar: obj?.ar || "",
        he: obj?.he || "",
      };
      // (price/duration unknown in this branch unless UI sends them)
      snapshot.price = Number(obj?.price || 0);
      snapshot.duration = Number(obj?.duration || 0);
      if (snapshot.duration > 0) need = slotsNeeded(snapshot.duration, gap);
    }

    // Conflict check
    const taken = await getTakenMap(businessId, date);
    if (!isRangeFree(grid, taken, startIdx, need)) {
      return res.status(409).json({ error: "Slot is already taken" });
    }

    const booking = await Booking.create({
      businessId,
      customerName,
      phoneNumber,
      serviceId: serviceId || undefined,
      serviceSnapshot: snapshot,
      staffId: staffId || undefined,
      date,
      time,
      status: status || "pending",
      source: "manual",
      notes: notes || "",
    });

    res.status(201).json({ message: "✅ Booking added successfully", booking });
  } catch (err) {
    console.error("❌ Error creating booking:", err);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

/* --------------------------------
   Update status only
----------------------------------*/
router.put("/update-status/:bookingId", protect, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const updated = await Booking.findByIdAndUpdate(
      req.params.bookingId,
      { status },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Booking not found" });
    res.json(updated);
  } catch (err) {
    console.error("❌ Error updating booking:", err.message);
    res.status(500).json({ error: "Failed to update booking" });
  }
});

/* --------------------------------
   Edit booking (re-validate on date/time/service change)
----------------------------------*/
router.put("/:id", protect, async (req, res) => {
  try {
    const current = await Booking.findById(req.params.id);
    if (!current) return res.status(404).json({ error: "Booking not found" });

    const biz = await Business.findById(current.businessId);
    if (!biz) return res.status(404).json({ error: "Business not found" });

    const nextDate = req.body.date ?? current.date;
    const nextTime = req.body.time ?? current.time;
    const nextServiceId = req.body.serviceId ?? current.serviceId;

    if (!isDate(nextDate)) return res.status(400).json({ error: 'date must be "YYYY-MM-DD"' });
    if (!isTime(nextTime)) return res.status(400).json({ error: 'time must be "HH:mm"' });

    // working constraints
    if ((biz.closedDates || []).includes(nextDate)) {
      return res.status(400).json({ error: "Business is closed on that date" });
    }
    const cfg = biz.config?.booking || {};
    const workingDays = Array.isArray(cfg.workingDays) ? cfg.workingDays : [];
    const weekday = weekdayFromISO(nextDate);
    if (!workingDays.includes(weekday)) {
      return res.status(400).json({ error: "Selected date is not a working day" });
    }

    const openingTime = cfg.openingTime || "09:00";
    const closingTime = cfg.closingTime || "18:00";
    const gap = Number(cfg.slotGapMinutes || 15);
    const grid = makeDayGrid(openingTime, closingTime, gap);
    const idx = grid.indexOf(nextTime);
    if (idx === -1) {
      return res.status(400).json({ error: "Time is outside working hours or not aligned to slot gap" });
    }

    // compute need slots for (possibly) new service
    let need = 1;
    let newSnapshot = current.serviceSnapshot;
    if (nextServiceId && String(nextServiceId) !== String(current.serviceId || "")) {
      const svc = findServiceById(biz, nextServiceId);
      if (!svc) return res.status(404).json({ error: "Service not found" });
      newSnapshot = {
        name: {
          en: svc.name?.en || "",
          ar: svc.name?.ar || "",
          he: svc.name?.he || "",
        },
        price: Number(svc.price || 0),
        duration: Number(svc.duration || 0),
      };
    }
    if (newSnapshot?.duration) need = slotsNeeded(newSnapshot.duration, gap);

    // conflict check (ignore this booking itself)
    const sameDay = await Booking.find({
      businessId: current.businessId,
      date: nextDate,
      _id: { $ne: current._id },
      status: { $in: ["pending", "confirmed"] },
    })
      .select("time")
      .lean();

    const taken = new Map();
    for (const b of sameDay) taken.set(b.time, true);
    if (!isRangeFree(grid, taken, idx, need)) {
      return res.status(409).json({ error: "Slot is already taken" });
    }

    const updateDoc = {
      ...req.body,
      date: nextDate,
      time: nextTime,
      serviceId: nextServiceId,
    };
    // keep snapshot in sync if serviceId changed or if none existed
    if (newSnapshot) updateDoc.serviceSnapshot = newSnapshot;

    const updated = await Booking.findByIdAndUpdate(req.params.id, updateDoc, {
      new: true,
    });

    res.json(updated);
  } catch (err) {
    console.error("❌ Error updating booking:", err);
    res.status(500).json({ error: "Failed to update booking" });
  }
});

/* --------------------------------
   Delete booking
----------------------------------*/
router.delete("/:id", protect, async (req, res) => {
  try {
    const deleted = await Booking.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Booking not found" });
    res.json({ message: "🗑️ Booking deleted" });
  } catch (err) {
    console.error("❌ Error deleting booking:", err);
    res.status(500).json({ error: "Failed to delete booking" });
  }
});

module.exports = router;