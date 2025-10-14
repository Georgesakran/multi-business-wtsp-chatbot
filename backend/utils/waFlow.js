// utils/waFlow.js
const Business = require("../models/Business");
const Booking = require("../models/Booking");
const ConversationState = require("../models/ConversationState");

/* ---------------- Utils you already use (trimmed & reused) ---------------- */
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const isTime = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const toHHMM = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

function makeDayGrid(openingTime, closingTime, slotGapMinutes) {
  const start = toMinutes(openingTime || "09:00");
  const end = toMinutes(closingTime || "18:00");
  const gap = Math.max(5, Number(slotGapMinutes || 15));
  const out = [];
  for (let t = start; t + gap <= end; t += gap) out.push(toHHMM(t));
  return out;
}
function slotsNeeded(duration, slotGapMinutes) {
  const gap = Math.max(5, Number(slotGapMinutes || 15));
  return Math.max(1, Math.ceil(Number(duration || 0) / gap));
}
function weekdayFromISO(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" });
}
function findServiceById(biz, serviceId) {
  const sid = String(serviceId || "");
  return (biz.services || []).find((s) => String(s._id) === sid) || null;
}
async function getTakenMap(businessId, date) {
  const sameDay = await Booking.find({
    businessId,
    date,
    status: { $in: ["pending", "confirmed"] },
  }).select("time status").lean();
  const map = new Map();
  for (const b of sameDay) if (isTime(b.time)) map.set(b.time, true);
  return map;
}
function isRangeFree(dayGrid, takenMap, startIndex, need) {
  for (let i = 0; i < need; i++) {
    const t = dayGrid[startIndex + i];
    if (!t || takenMap.get(t)) return false;
  }
  return true;
}

/* ---------------- Helper: build next N working days ---------------- */
function nextWorkingDates(biz, n = 10) {
  const cfg = biz.config?.booking || {};
  const workingDays = Array.isArray(cfg.workingDays) ? cfg.workingDays : [];
  const out = [];
  let d = new Date();
  for (let i = 0; i < 40 && out.length < n; i++) {
    const iso = d.toISOString().slice(0,10);
    const weekday = weekdayFromISO(iso);
    const closed = (biz.closedDates || []).includes(iso);
    if (workingDays.includes(weekday) && !closed) out.push(iso);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/* ---------------- Message builders (plain text lists) ---------------- */
function mainMenuText(biz) {
  const name = biz.nameEnglish || biz.nameArabic || biz.nameHebrew || "Our salon";
  const lines = [
    `👋 Welcome to ${name}!`,
    "",
    "Please choose:",
    "1) Book a service",
    "2) Order a product",
    "3) FAQs",
    "0) Talk to a human",
  ];
  return lines.join("\n");
}
function servicesListText(biz) {
  const active = (biz.services || []).filter(s => s.isActive);
  if (!active.length) return "No services are available at the moment.";
  const lines = ["💅 Choose a service:"];
  active.forEach((s, i) => {
    const n = s.name?.en || s.name?.ar || s.name?.he || "Service";
    const price = s.price ? ` - ${s.price}` : "";
    const dur = s.duration ? ` (${s.duration}m)` : "";
    lines.push(`${i+1}) ${n}${price}${dur}`);
  });
  lines.push("", "Reply with the number of the service.");
  return lines.join("\n");
}
function datesListText(dates) {
  const lines = ["📅 Choose a date:"];
  dates.forEach((iso, i) => {
    const d = new Date(`${iso}T00:00:00`);
    const label = d.toLocaleDateString("en-GB", { weekday:"short", day:"2-digit", month:"2-digit" });
    lines.push(`${i+1}) ${label} (${iso})`);
  });
  lines.push("", "Reply with the number of the date.");
  return lines.join("\n");
}
function timesListText(slots) {
  if (!slots.length) return "No free time slots on that day. Reply:\n- 9 to pick another date\n- 0 to go back to menu";
  const lines = ["⏰ Available times:"];
  slots.forEach((t, i) => lines.push(`${i+1}) ${t}`));
  lines.push("", "Reply with the number of the time.");
  return lines.join("\n");
}
function confirmText(biz, svc, date, time) {
  const svcName = svc?.name?.en || svc?.name?.ar || svc?.name?.he || "Service";
  return [
    "✅ Please confirm your booking:",
    `• Service: ${svcName}`,
    `• Date: ${date}`,
    `• Time: ${time}`,
    "",
    "1) Confirm",
    "2) Cancel",
  ].join("\n");
}

/* ---------------- Availability for (serviceId, date) ---------------- */
async function freeSlotsFor(biz, date, serviceId) {
  const cfg = biz.config?.booking || {};
  const openingTime = cfg.openingTime || "09:00";
  const closingTime = cfg.closingTime || "18:00";
  const gap = Number(cfg.slotGapMinutes || 15);

  const grid = makeDayGrid(openingTime, closingTime, gap);
  let need = 1;
  const svc = findServiceById(biz, serviceId);
  if (svc && svc.bookable && svc.duration) need = slotsNeeded(svc.duration, gap);

  const taken = await getTakenMap(biz._id, date);
  const free = [];
  for (let i = 0; i < grid.length; i++) if (isRangeFree(grid, taken, i, need)) free.push(grid[i]);
  return free;
}

/* ---------------- Main state machine ---------------- */
async function handleFlowIncoming({ business, from, text }) {
  // 0) Fetch state
  let state = await ConversationState.findOne({ businessId: business._id, phoneNumber: from });
  if (!state) {
    state = await ConversationState.create({
      businessId: business._id,
      phoneNumber: from,
      mode: "flow",
      step: "menu",
      data: {}
    });
  }

  const lower = (text || "").trim().toLowerCase();

  // quick resets
  if (["menu", "start", "reset"].includes(lower) || lower === "0") {
    await state.updateOne({ step: "menu", data: {} });
  }

  // route by step
  switch (state.step) {
    case "menu": {
      // accept numeric
      if (["1","2","3"].includes(lower)) {
        if (lower === "1") {
          await state.updateOne({ step: "pick_service", data: {} });
          return servicesListText(business);
        }
        if (lower === "2") {
          return "🛒 Product ordering flow coming soon.\nReply 0 for menu.";
        }
        if (lower === "3") {
          const faqs = business.faqs || [];
          if (!faqs.length) return "No FAQs yet. Reply 0 for menu.";
          const lines = ["❓ FAQs:"];
          faqs.slice(0,5).forEach((f,i)=> lines.push(`${i+1}) ${f.question?.en || 'Q'}`));
          lines.push("", "Reply 0 for menu.");
          return lines.join("\n");
        }
      }
      // default render
      return mainMenuText(business);
    }

    case "pick_service": {
      const active = (business.services || []).filter(s => s.isActive);
      const idx = Number(lower) - 1;
      if (idx >= 0 && idx < active.length) {
        const serviceId = String(active[idx]._id);
        const dates = nextWorkingDates(business, 10);
        await state.updateOne({ step: "pick_date", data: { serviceId, dates } });
        return datesListText(dates);
      }
      if (lower === "0") {
        await state.updateOne({ step: "menu", data: {} });
        return mainMenuText(business);
      }
      return servicesListText(business);
    }

    case "pick_date": {
      const data = state.data || {};
      const dates = Array.isArray(data.dates) ? data.dates : [];
      const idx = Number(lower) - 1;
      if (idx >= 0 && idx < dates.length) {
        const date = dates[idx];
        const slots = await freeSlotsFor(business, date, data.serviceId);
        await state.updateOne({ step: "pick_time", data: { ...data, date, slots } });
        return timesListText(slots);
      }
      if (lower === "9") {
        // regenerate dates
        const nd = nextWorkingDates(business, 10);
        await state.updateOne({ step: "pick_date", data: { serviceId: data.serviceId, dates: nd } });
        return datesListText(nd);
      }
      if (lower === "0") {
        await state.updateOne({ step: "menu", data: {} });
        return mainMenuText(business);
      }
      return datesListText(dates);
    }

    case "pick_time": {
      const data = state.data || {};
      const slots = Array.isArray(data.slots) ? data.slots : [];
      const idx = Number(lower) - 1;
      if (idx >= 0 && idx < slots.length) {
        const time = slots[idx];
        await state.updateOne({ step: "confirm", data: { ...data, time } });
        const svc = findServiceById(business, data.serviceId);
        return confirmText(business, svc, data.date, time);
      }
      if (lower === "9") {
        await state.updateOne({ step: "pick_date", data: { serviceId: data.serviceId, dates: nextWorkingDates(business,10) } });
        return datesListText(nextWorkingDates(business,10));
      }
      if (lower === "0") {
        await state.updateOne({ step: "menu", data: {} });
        return mainMenuText(business);
      }
      return timesListText(slots);
    }

    case "confirm": {
      const data = state.data || {};
      if (lower === "1") {
        // persist booking
        const svc = findServiceById(business, data.serviceId);
        const snapshot = {
          name: {
            en: svc?.name?.en || "",
            ar: svc?.name?.ar || "",
            he: svc?.name?.he || "",
          },
          price: Number(svc?.price || 0),
          duration: Number(svc?.duration || 0),
        };
        await Booking.create({
          businessId: business._id,
          customerName: "WhatsApp User",
          phoneNumber: state.phoneNumber,
          serviceId: data.serviceId,
          serviceSnapshot: snapshot,
          date: data.date,
          time: data.time,
          status: "pending",
          source: "whatsapp",
        });
        await state.updateOne({ step: "menu", data: {} });
        return "🎉 Your booking was created (pending). We’ll confirm shortly. Reply 0 for menu.";
      }
      if (lower === "2") {
        await state.updateOne({ step: "menu", data: {} });
        return "❌ Cancelled. Reply 0 for menu.";
      }
      // re-render confirm
      const svc = findServiceById(business, data.serviceId);
      return confirmText(business, svc, data.date, data.time);
    }

    default:
      await state.updateOne({ step: "menu", data: {} });
      return mainMenuText(business);
  }
}

module.exports = { handleFlowIncoming };