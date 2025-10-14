// routes/availabilityRoutes.js
const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const StaffSchedule = require("../models/StaffSchedule");
const Business = require("../models/Business");

function timeToMin(s){ const [h,m]=s.split(":").map(Number); return h*60+m; }
function minToTime(n){ const h=String(Math.floor(n/60)).padStart(2,"0"); const m=String(n%60).padStart(2,"0"); return `${h}:${m}`; }

router.get("/", async (req, res) => {
  try {
    const { businessId, serviceDuration=30, staffId, date } = req.query;
    if (!businessId || !date) return res.status(400).json({ message: "businessId & date required" });

    const biz = await Business.findById(businessId).lean();
    if (!biz) return res.status(404).json({ message: "Business not found" });
    const gap = Number(biz?.config?.booking?.slotGapMinutes || 15);
    const open = biz?.config?.booking?.openingTime || "09:00";
    const close= biz?.config?.booking?.closingTime || "18:00";

    // staff schedule (MVP: ignore overrides)
    const q = { businessId };
    if (staffId) q.staffId = staffId;
    const schedules = await StaffSchedule.find(q).lean();

    const dow = new Date(`${date}T00:00:00`).getDay(); // 0=Sun
    const daySlots = [];

    for (const sch of schedules) {
      const day = sch.weekly?.find(w => Number(w.dow) === dow);
      if (!day) continue;
      const startMin = timeToMin(day.start || open);
      const endMin   = timeToMin(day.end   || close);
      for (let t=startMin; t+Number(serviceDuration)<=endMin; t += gap) {
        daySlots.push({ time: minToTime(t), staffId: sch.staffId });
      }
    }

    // remove conflicts
    const booked = await Booking.find({ businessId, date, ...(staffId ? { staffId } : {}) }, "time staffId").lean();
    const busyKey = new Set(booked.map(b => `${b.staffId||"ANY"}|${b.time}`));

    const free = daySlots.filter(s => !busyKey.has(`${s.staffId}|${s.time}`));

    res.json({ date, slots: free });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to compute availability" });
  }
});

module.exports = router;