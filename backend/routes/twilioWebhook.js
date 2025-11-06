// routes/twilioWebhook.js
const express = require("express");
const router = express.Router();

const Business = require("../models/Business");
const Customer = require("../models/Customer");
const Booking  = require("../models/Booking");

const { sendWhatsApp } = require("../utils/sendTwilio");
const { getDateOptions, getTimeOptions, periodBuckets } = require("../utils/availability");
const { getState, setState } = require("../utils/state");
const { isExpired } = require("../utils/session");

// constants
const BACK   = "0";
const CANCEL = "9";

const lines    = (...xs) => xs.filter(Boolean).join("\n");
const numbered = (arr) => arr.map((x, i) => `${i + 1}) ${x.title}`).join("\n");

// ----- small helpers ----- //
function serviceOptions(biz) {
  const services = (biz.services || []).filter(s => s.bookable && s.isActive);
  return services.map(s => ({
    id: String(s._id),
    title: `${s.name?.en || s.name?.ar || s.name?.he} - ${s.price || 0} (${s.duration || 30}m)`,
    raw: s
  }));
}

function pickByIndex(list, text) {
  const idx = parseInt(text, 10);
  if (Number.isNaN(idx)) return null;
  return list[idx - 1] || null;
}

async function upsertCustomer(biz, phone) {
  const now = new Date();
  const doc = await Customer.findOneAndUpdate(
    { businessId: biz._id, phone },
    { $setOnInsert: { businessId: biz._id, phone }, $set: { "stats.lastSeenAt": now } },
    { new: true, upsert: true }
  );
  return doc;
}

// figure which field is missing (first-booking flow)
function nextMissingField(cust) {
  if (!cust?.name) return { key: "name", prompt: "Your full name?" };
  if (!cust?.city) return { key: "city", prompt: "Which city do you live in?" };
  if (!cust?.age)  return { key: "age",  prompt: "Your age? (numbers only)" };
  return null;
}

// ----- view steps ----- //
async function showServices({ biz, to, state }) {
  const opts = serviceOptions(biz);
  if (opts.length === 0) {
    await sendWhatsApp({ from: biz.wa.number, to, body: "No services available right now." });
    return;
  }
  await setState(state, { step: "SELECT_SERVICE", data: { services: opts } });

  const body = lines(
    `*${biz.nameEnglish}* — Choose a service:`,
    numbered(opts),
    "",
    `${CANCEL}) Cancel`
  );
  await sendWhatsApp({ from: biz.wa.number, to, body });
}

async function showDates({ biz, to, state }) {
  const { serviceId } = state.data;
  const dates = await getDateOptions(biz, serviceId, 14); // next 14 days
  await setState(state, { step: "SELECT_DATE", data: { ...state.data, dates } });

  const body = lines(`Choose a date:`, numbered(dates), "", `${BACK}) Back   •   ${CANCEL}) Cancel`);
  await sendWhatsApp({ from: biz.wa.number, to, body });
}

async function showPeriods({ biz, to, state }) {
  const periods = periodBuckets();
  await setState(state, { step: "SELECT_PERIOD", data: { ...state.data, periods } });

  const body = lines(`Choose time period:`, numbered(periods), "", `${BACK}) Back   •   ${CANCEL}) Cancel`);
  await sendWhatsApp({ from: biz.wa.number, to, body });
}

async function showTimes({ biz, to, state }) {
  const services = state.data.services || serviceOptions(biz);
  const service  = services.find(s => s.id === state.data.serviceId)?.raw;

  const times = await getTimeOptions({
    business: biz,
    service,
    date: state.data.date,
    period: state.data.period
  });

  if (times.length === 0) {
    await sendWhatsApp({ from: biz.wa.number, to, body: "No free slots in that period. Pick another period." });
    return showPeriods({ biz, to, state });
  }

  await setState(state, { step: "SELECT_TIME", data: { ...state.data, times } });

  const body = lines(`Available times on ${state.data.date}:`, numbered(times), "", `${BACK}) Back   •   ${CANCEL}) Cancel`);
  await sendWhatsApp({ from: biz.wa.number, to, body });
}

async function collectName({ biz, to, state }) {
  await setState(state, { step: "COLLECT_NAME" });
  await sendWhatsApp({
    from: biz.wa.number, to,
    body: lines("Your full name?", "", `${BACK}) Back   •   ${CANCEL}) Cancel`)
  });
}

async function collectCity({ biz, to, state }) {
  await setState(state, { step: "COLLECT_CITY" });
  await sendWhatsApp({
    from: biz.wa.number, to,
    body: lines("Which city do you live in?", "", `${BACK}) Back   •   ${CANCEL}) Cancel`)
  });
}

async function collectAge({ biz, to, state }) {
  await setState(state, { step: "COLLECT_AGE" });
  await sendWhatsApp({
    from: biz.wa.number, to,
    body: lines("Your age? (numbers only)", "", `${BACK}) Back   •   ${CANCEL}) Cancel`)
  });
}

async function collectNotes({ biz, to, state }) {
  await setState(state, { step: "COLLECT_NOTES" });
  await sendWhatsApp({
    from: biz.wa.number, to,
    body: lines("Any notes or special requests? (or type '-' for none)", "", `${BACK}) Back   •   ${CANCEL}) Cancel`)
  });
}

async function review({ biz, to, state }) {
    const services = state.data.services || serviceOptions(biz);
    const svc = services.find(s => s.id === state.data.serviceId)?.raw;
  
    const name = state.data.name || (await Customer.findOne(
      { businessId: biz._id, phone: to.replace("whatsapp:","") }
    ))?.name || "-";
  
    const summary = lines(
      `*Review your booking:*`,
      `Service: ${svc?.name?.en || svc?.name?.ar || svc?.name?.he}`,
      `Date: ${state.data.date}`,
      `Time: ${state.data.time}`,
      `Name: ${name}`,
      state.data.city ? `City: ${state.data.city}` : "",
      Number.isFinite(state.data.age) ? `Age: ${state.data.age}` : "",
      state.data.notes ? `Notes: ${state.data.notes}` : ""
    );

  await setState(state, { step: "REVIEW", data: { ...state.data } });

  const body = lines(summary, "", `1) Confirm`, `${BACK}) Back   •   ${CANCEL}) Cancel`);
  await sendWhatsApp({ from: biz.wa.number, to, body });
}

async function finalize({ biz, to, from, state }) {
  const services   = state.data.services || serviceOptions(biz);
  const svc        = services.find(s => s.id === state.data.serviceId)?.raw;
  const serviceName = svc?.name?.en || svc?.name?.ar || svc?.name?.he;

  // guard against race: the slot might have been taken
  const slotTaken = await Booking.findOne({ businessId: biz._id, date: state.data.date, time: state.data.time });
  if (slotTaken) {
    await sendWhatsApp({ from: biz.wa.number, to, body: "Sorry, that time was just taken. Please choose another slot." });
    await setState(state, { step: "SELECT_TIME" });
    return showTimes({ biz, to, state });
  }

  const booking = await Booking.create({
    businessId: biz._id,
    customerName: state.data.name,
    phoneNumber: from,
    serviceId: svc?._id,
    serviceSnapshot: { name: svc?.name || {}, price: svc?.price || 0, duration: svc?.duration || 30 },
    addonServices: [],
    date: state.data.date,
    time: state.data.time,
    notes: state.data.notes || "",
    status: "confirmed",
    source: "whatsapp"
  });

  const { date, time } = state.data;

  await setState(state, { step: "DONE", data: {} });

  // customer receipt
  await sendWhatsApp({
    from: biz.wa.number,
    to,
    body: `✅ Booked! #${String(booking._id).slice(-6)}\n${serviceName}\n${date} at ${time}\n*${biz.nameEnglish}* thanks you! 💅`
  });

  // optional owner alert
  if (biz.ownerPhone) {
    await sendWhatsApp({
      from: biz.wa.number,
      to: biz.ownerPhone,
      body:
`🆕 New booking
Service: ${serviceName}
Date: ${date}
Time: ${time}
Name: ${state.data.name}
City: ${state.data.city || "-"}
Age: ${state.data.age || "-"}
Phone: ${from}`
    });
  }
}

// ---------- MAIN WEBHOOK ---------- //
router.post("/", async (req, res) => {
  try {
    const body = req.body;

    const from = (body.From || "").replace("whatsapp:", ""); // customer number
    const to   = (body.To   || "").replace("whatsapp:", ""); // business WA number

    // which business (by receiving number)
    const biz = await Business.findOne({ "wa.number": to, isActive: true }).lean();
    if (!biz) return res.sendStatus(200);

    // ensure a Customer doc exists + update last seen
    const customer = await upsertCustomer(biz, from);

    // state
    let state = await getState({ businessId: biz._id, phone: from });

    // expire session (30min)
    if (isExpired(state.updatedAt, 1000 * 60 * 30)) {
      state = await setState(state, { step: "SERVICE", data: {} });
      await showServices({ biz, to: from, state });
      return res.sendStatus(200);
    }

    // global commands
    const txt = (body.Body || "").trim().toLowerCase();

    if (["restart", "menu"].includes(txt)) {
      await setState(state, { step: "SERVICE", data: {} });
      await showServices({ biz, to: from, state });
      return res.sendStatus(200);
    }

    if (txt === CANCEL || txt === "cancel") {
      await setState(state, { step: "SERVICE", data: {} });
      await sendWhatsApp({ from: biz.wa.number, to: from, body: "❌ Cancelled. Type *book* to start again." });
      return res.sendStatus(200);
    }

    // entry point
    if (["book", "احجز", "حجز", "הזמנה"].includes(txt)) {
      await showServices({ biz, to: from, state });
      return res.sendStatus(200);
    }

    function nextMissingField(cust) {
        const has = (v) => typeof v === "number" ? Number.isFinite(v) : !!String(v || "").trim();
      
        if (!has(cust?.name)) return { key: "name", prompt: "Your full name?" };
        if (!has(cust?.city)) return { key: "city", prompt: "Which city do you live in?" };
        if (!has(cust?.age))  return { key: "age",  prompt: "Your age? (numbers only)" };
        return null;
      }
    // step router
    switch (state.step) {
      case "SERVICE":
      case "SELECT_SERVICE": {
        const opts   = state.data.services || serviceOptions(biz);
        const picked = pickByIndex(opts, body.Body || "");
        if (!picked) {
          await showServices({ biz, to: from, state });
          return res.sendStatus(200);
        }
        await setState(state, { data: { ...state.data, serviceId: picked.id } });
        await showDates({ biz, to: from, state });
        break;
      }

      case "SELECT_DATE": {
        if (body.Body === BACK) return showServices({ biz, to: from, state });
        const picked = pickByIndex(state.data.dates || [], body.Body || "");
        if (!picked) return showDates({ biz, to: from, state });
        await setState(state, { data: { ...state.data, date: picked.id } });
        await showPeriods({ biz, to: from, state });
        break;
      }

      case "SELECT_PERIOD": {
        if (body.Body === BACK) return showDates({ biz, to: from, state });
        const picked = pickByIndex(state.data.periods || [], body.Body || "");
        if (!picked) return showPeriods({ biz, to: from, state });
        await setState(state, { data: { ...state.data, period: picked.id } });
        await showTimes({ biz, to: from, state });
        break;
      }

      case "SELECT_TIME": {
        if (body.Body === BACK) return showPeriods({ biz, to: from, state });
      
        const picked = pickByIndex(state.data.times || [], body.Body || "");
        if (!picked) return showTimes({ biz, to: from, state });
      
        // save chosen time
        await setState(state, { data: { ...state.data, time: picked.id } });
      
        // 🔹 Always hydrate state with known customer profile
        const freshCustomer = await Customer.findOne({ businessId: biz._id, phone: from }).lean();
        state.data.name = freshCustomer?.name || state.data.name;
        state.data.city = freshCustomer?.city || state.data.city;
        state.data.age  = freshCustomer?.age  ?? state.data.age;
      
        // decide what to collect next
        const missing = nextMissingField(freshCustomer);
        if (!missing) {
          await setState(state, { step: "REVIEW", data: state.data });
          await review({ biz, to: from, state });
          return res.sendStatus(200);
        }
        if (missing.key === "name") return collectName({ biz, to: from, state });
        if (missing.key === "city") return collectCity({ biz, to: from, state });
        if (missing.key === "age")  return collectAge({ biz, to: from, state });
        break;
      }
      case "COLLECT_NAME": {
        if (body.Body === BACK) return showTimes({ biz, to: from, state });

        const name = (body.Body || "").trim();
        if (!name) {
          await sendWhatsApp({ from: biz.wa.number, to: from, body: "Please type your full name." });
          return res.sendStatus(200);
        }

        await Customer.updateOne({ businessId: biz._id, phone: from }, { $set: { name } });
        state.data.name = name;

        // next missing
        const fresh = await Customer.findOne({ businessId: biz._id, phone: from });
        const missing = nextMissingField(fresh);
        if (!missing) return collectNotes({ biz, to: from, state });
        if (missing.key === "city") return collectCity({ biz, to: from, state });
        if (missing.key === "age")  return collectAge({ biz, to: from, state });
        break;
      }

      case "COLLECT_CITY": {
        if (body.Body === BACK) return collectName({ biz, to: from, state });

        const city = (body.Body || "").trim();
        if (!city) {
          await sendWhatsApp({ from: biz.wa.number, to: from, body: "Please type your city." });
          return res.sendStatus(200);
        }

        await Customer.updateOne({ businessId: biz._id, phone: from }, { $set: { city } });
        state.data.city = city;

        const fresh = await Customer.findOne({ businessId: biz._id, phone: from });
        const missing = nextMissingField(fresh);
        if (!missing) return collectNotes({ biz, to: from, state });
        if (missing.key === "age")  return collectAge({ biz, to: from, state });
        break;
      }

      case "COLLECT_AGE": {
        if (body.Body === BACK) return collectCity({ biz, to: from, state });

        const age = parseInt((body.Body || "").trim(), 10);
        if (!Number.isFinite(age) || age < 1 || age > 120) {
          await sendWhatsApp({ from: biz.wa.number, to: from, body: "Please enter a valid age (1–120)." });
          return res.sendStatus(200);
        }

        await Customer.updateOne({ businessId: biz._id, phone: from }, { $set: { age } });
        state.data.age = age;

        // move to notes
        await collectNotes({ biz, to: from, state });
        break;
      }

      case "COLLECT_NOTES": {
        if (body.Body === BACK) {
          // go back in collection order: age -> city -> name
          if (!state.data.age)  return collectAge({ biz, to: from, state });
          if (!state.data.city) return collectCity({ biz, to: from, state });
          return collectName({ biz, to: from, state });
        }

        const notes = (body.Body || "") === "-" ? "" : (body.Body || "");
        await setState(state, { data: { ...state.data, notes } });
        await review({ biz, to: from, state });
        break;
      }

      case "REVIEW": {
        if (body.Body === BACK) return collectNotes({ biz, to: from, state });

        const choice = parseInt(body.Body || "", 10);
        if (choice === 1) await finalize({ biz, to: from, from, state });
        else await review({ biz, to: from, state });
        break;
      }

      default: {
        await showServices({ biz, to: from, state });
      }
    }

  } catch (err) {
    console.error("Twilio webhook error:", err);
    // Always 200 so Twilio doesn’t retry
    res.sendStatus(200);
  }
});

module.exports = router;