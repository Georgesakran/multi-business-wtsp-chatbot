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

// i18n-lite (optional later). For now we keep EN strings.
const tzOf = (biz) => biz.timezone || "Asia/Jerusalem"; // set per business if you have it
const prettyDate = (iso, tz) => new Date(iso+"T00:00:00").toLocaleDateString("en-GB", { weekday:"short", day:"2-digit", month:"short", timeZone: tz });
const prettyTime = (t) => t; // you already format HH:MM; keep as-is for now

// Normalizers
const rawText = (req) => (req.body.Body || "").trim();
const lower   = (txt) => txt.toLowerCase();
const isBackCmd   = (txt) => txt === BACK || lower(txt) === "back";
const isCancelCmd = (txt) => txt === CANCEL || lower(txt) === "cancel";

// Safer numeric pick (accepts "2", "02", " 2 ")
function pickByIndexSafe(list, text) {
  const m = String(text).trim().match(/^\d+$/);
  if (!m) return null;
  const n = parseInt(m[0], 10);
  return list[n - 1] || null;
}

// Send + always return 200 (so we don’t forget to return)
async function replyAndEnd(res, { from, to, body }) {
  await sendWhatsApp({ from, to, body });
  return res.sendStatus(200);
}

// A tiny “tip” line we can reuse
const tipLine = `${BACK}) Back   •   ${CANCEL}) Cancel`;

// Acknowledge selection helper
async function ack(res, biz, to, text) {
  await sendWhatsApp({ from: biz.wa.number, to, body: `👌 ${text}` });
}

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

function paginate(arr, page = 1, per = 9) {
    const p = Math.max(1, page);
    const start = (p - 1) * per;
    const slice = arr.slice(start, start + per);
    const totalPages = Math.max(1, Math.ceil(arr.length / per));
    return { slice, page: p, totalPages };
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

async function showDates({ biz, to, state, page = 1 }) {
    const { serviceId } = state.data;
    if (!state.data.dates) {
      const dates = await getDateOptions(biz, serviceId, 21); // up to 3 weeks
      await setState(state, { data: { ...state.data, dates } });
    }
    const { dates } = state.data;
  
    const { slice, totalPages } = paginate(dates, page, 9);
    await setState(state, { step: "SELECT_DATE", data: { ...state.data, page } });
  
    const tz = tzOf(biz);
    const linesList = slice.map((d, i) => `${i + 1}) ${prettyDate(d.id, tz).replace(",", "")}`);
    const nav = [
      page > 1 ? "P) Prev" : null,
      page < totalPages ? "N) Next" : null,
    ].filter(Boolean).join("   •   ");
  
    const body = [
      `Choose a date:`,
      linesList.join("\n"),
      "",
      [nav, tipLine].filter(Boolean).join("\n")
    ].join("\n");
  
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
  
    const tz = tzOf(biz);
    const header = `Available times on *${prettyDate(state.data.date, tz)}*:`;
    const body = [
      header,
      times.map((t, i) => `${i + 1}) ${prettyTime(t.title)}`).join("\n"),
      "",
      tipLine
    ].join("\n");
  
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
    const svc      = services.find(s => s.id === state.data.serviceId)?.raw;
  
    const tz = tzOf(biz);
    const name = state.data.name || "-";
  
    const summary = lines(
      `*Review your booking:*`,
      `Service: ${svc?.name?.en || svc?.name?.ar || svc?.name?.he}`,
      `Date: ${prettyDate(state.data.date, tz)}`,
      `Time: ${prettyTime(state.data.time)}`,
      `Name: ${name}`,
      state.data.city ? `City: ${state.data.city}` : "",
      Number.isFinite(state.data.age) ? `Age: ${state.data.age}` : "",
      state.data.notes ? `Notes: ${state.data.notes}` : ""
    );
  
    await setState(state, { step: "REVIEW", data: { ...state.data } });
    const body = lines(summary, "", `1) Confirm`, tipLine);
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
    body:[ `✅ Booked! #${String(booking._id).slice(-6)}`,
    `${serviceName}`,
    `${prettyDate(date , tzOf(biz))} at ${prettyTime(time)}`,
   `*${biz.nameEnglish}* thanks you! 😊`,
    "",
    "Reply *menu* any time to start a new booking."
  ].join("\n")
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
    const txt = lower(rawText(req));
    if (["help", "?", "instructions"].includes(txt)) {
    return replyAndEnd(res, {
        from: biz.wa.number,
        to:   from,
        body: [
        "ℹ️ *How to use*",
        "• Reply with the *number* of your choice (1, 2, 3...).",
        `• *${BACK}* or *back* to go one step back.`,
        `• *${CANCEL}* or *cancel* to quit and start over.`,
        ].join("\n")
    });
    }
    if (["restart", "menu"].includes(txt)) {
    state = await setState(state, { step: "SERVICE", data: {} });
    return replyAndEnd(res, { from: biz.wa.number, to: from, body: `🔁 Starting again…` })
        .then(() => showServices({ biz, to: from, state }));
    }
    if (isCancelCmd(txt)) {
    await setState(state, { step: "SERVICE", data: {} });
    return replyAndEnd(res, { from: biz.wa.number, to: from, body: "❌ Cancelled. Type *book* to start again." });
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
            const picked = pickByIndexSafe(opts, body.Body);
            if (!picked) {
              return replyAndEnd(res, { from: biz.wa.number, to: from, body: "Please reply with a number from the list." })
                .then(() => showServices({ biz, to: from, state }));
            }
            await ack(res, biz, from, `Service: *${picked.raw?.name?.en || picked.title}*`);
            await setState(state, { data: { ...state.data, serviceId: picked.id } });
            return showDates({ biz, to: from, state, page: 1 });
          }
          
          case "SELECT_DATE": {
            const raw = rawText(req);
            if (isBackCmd(raw)) return showServices({ biz, to: from, state });
          
            // pagination
            if (lower(raw) === "n") return showDates({ biz, to: from, state, page: (state.data.page || 1) + 1 });
            if (lower(raw) === "p") return showDates({ biz, to: from, state, page: Math.max(1, (state.data.page || 1) - 1) });
          
            const page = state.data.page || 1;
            const { slice } = paginate(state.data.dates || [], page, 9);
            const picked = pickByIndexSafe(slice, raw);
            if (!picked) {
              return replyAndEnd(res, { from: biz.wa.number, to: from, body: "Please choose a number from the list (or N/P for more dates)." })
                .then(() => showDates({ biz, to: from, state, page }));
            }
            const tz = tzOf(biz);
            await ack(res, biz, from, `Date: *${prettyDate(picked.id, tz)}*`);
            await setState(state, { data: { ...state.data, date: picked.id } });
            return showPeriods({ biz, to: from, state });
          }
          
          case "SELECT_PERIOD": {
            const raw = rawText(req);
            if (isBackCmd(raw)) return showDates({ biz, to: from, state, page: state.data.page || 1 });
          
            const picked = pickByIndexSafe(state.data.periods || [], raw);
            if (!picked) {
              return replyAndEnd(res, { from: biz.wa.number, to: from, body: "Please reply with 1, 2 or 3 for Morning / Afternoon / Evening." })
                .then(() => showPeriods({ biz, to: from, state }));
            }
            await ack(res, biz, from, `Period: *${picked.title}*`);
            await setState(state, { data: { ...state.data, period: picked.id } });
            return showTimes({ biz, to: from, state });
          }
          
          case "SELECT_TIME": {
            const raw = rawText(req);
            if (isBackCmd(raw)) return showPeriods({ biz, to: from, state });
          
            const picked = pickByIndexSafe(state.data.times || [], raw);
            if (!picked) {
              return replyAndEnd(res, { from: biz.wa.number, to: from, body: "Please choose a time number from the list." })
                .then(() => showTimes({ biz, to: from, state }));
            }
            await ack(res, biz, from, `Time: *${picked.title}*`);
            await setState(state, { data: { ...state.data, time: picked.id } });
          
            // hydrate customer & decide what to collect next (your existing logic)
            const freshCustomer = await Customer.findOne({ businessId: biz._id, phone: from }).lean();
            state.data.name = freshCustomer?.name || state.data.name;
            state.data.city = freshCustomer?.city || state.data.city;
            state.data.age  = freshCustomer?.age  ?? state.data.age;
          
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