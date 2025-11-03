const express = require("express");
const router = express.Router();
const Business = require("../models/Business");
const Customer = require("../models/Customer");
const ConversationState = require("../models/ConversationState");
const Booking = require("../models/Booking");
const { sendWhatsApp } = require("../utils/sendTwilio");
const { getDateOptions, getTimeOptions, periodBuckets } = require("../utils/availability");

const BACK = "0";
const CANCEL = "9";

const lines = (...xs) => xs.filter(Boolean).join("\n");
const numbered = (arr) => arr.map((x,i)=>`${i+1}) ${x.title}`).join("\n");

async function upsertCustomer(business, phone) {
  const now = new Date();
  const doc = await Customer.findOneAndUpdate(
    { businessId: business._id, phone },
    { $setOnInsert: { businessId: business._id, phone }, $set: { "stats.lastSeenAt": now } },
    { new: true, upsert: true }
  );
  return doc;
}
async function getState(business, phone) {
  return ConversationState.findOneAndUpdate(
    { businessId: business._id, phoneNumber: phone },
    { $setOnInsert: { step: "SELECT_SERVICE", data: {} } },
    { new: true, upsert: true }
  );
}
async function setState(state, patch) {
  Object.assign(state, patch);
  await state.save();
}

function serviceOptions(biz) {
  const services = (biz.services||[]).filter(s => s.bookable && s.isActive);
  return services.map(s => ({
    id: String(s._id),
    title: `${s.name?.en || s.name?.ar || s.name?.he} - ${s.price||0} (${s.duration||30}m)`,
    raw: s
  }));
}
function pickByIndex(list, text) {
  const idx = parseInt(text,10);
  if (Number.isNaN(idx)) return null;
  return list[idx-1] || null;
}

async function showServices({biz, to, from, state}) {
  const opts = serviceOptions(biz);
  if (opts.length === 0) {
    await sendWhatsApp({ from: biz.wa.number, to, body: "No services available right now." });
    return;
  }
  await setState(state, { step: "SELECT_SERVICE", data: { services: opts }});
  const body = lines(
    `*${biz.nameEnglish}* — Choose a service:`,
    numbered(opts),
    "",
    `${CANCEL}) Cancel`
  );
  await sendWhatsApp({ from: biz.wa.number, to, body });
}

async function showDates({biz, to, from, state}) {
  const { serviceId } = state.data;
  const dates = await getDateOptions(biz, serviceId, 14);
  await setState(state, { step: "SELECT_DATE", data: { ...state.data, dates } });
  const body = lines(
    `Choose a date:`,
    numbered(dates),
    "",
    `${BACK}) Back   •   ${CANCEL}) Cancel`
  );
  await sendWhatsApp({ from: biz.wa.number, to, body });
}

async function showPeriods({biz, to, from, state}) {
  const periods = periodBuckets();
  await setState(state, { step: "SELECT_PERIOD", data: { ...state.data, periods } });
  const body = lines(
    `Choose time period:`,
    numbered(periods),
    "",
    `${BACK}) Back   •   ${CANCEL}) Cancel`
  );
  await sendWhatsApp({ from: biz.wa.number, to, body });
}

async function showTimes({biz, to, from, state}) {
  const services = state.data.services || serviceOptions(biz);
  const service = services.find(s => s.id === state.data.serviceId)?.raw;
  const times = await getTimeOptions({ business: biz, service, date: state.data.date, period: state.data.period });
  if (times.length === 0) {
    await sendWhatsApp({ from: biz.wa.number, to, body: "No free slots in that period. Pick another period." });
    return showPeriods({biz,to,from,state});
  }
  await setState(state, { step: "SELECT_TIME", data: { ...state.data, times } });
  const body = lines(
    `Available times on ${state.data.date}:`,
    numbered(times),
    "",
    `${BACK}) Back   •   ${CANCEL}) Cancel`
  );
  await sendWhatsApp({ from: biz.wa.number, to, body });
}

async function collectDetails({biz, to, from, state}) {
  await setState(state, { step: "COLLECT_NAME", data: { ...state.data } });
  await sendWhatsApp({ from: biz.wa.number, to, body: lines(
    `Your full name?`,
    "",
    `${BACK}) Back   •   ${CANCEL}) Cancel`
  )});
}

async function review({biz, to, from, state}) {
  const services = state.data.services || serviceOptions(biz);
  const svc = services.find(s => s.id === state.data.serviceId)?.raw;
  const summary = lines(
    `*Review your booking:*`,
    `Service: ${svc?.name?.en || svc?.name?.ar || svc?.name?.he}`,
    `Date: ${state.data.date}`,
    `Time: ${state.data.time}`,
    `Name: ${state.data.name}`,
    state.data.notes ? `Notes: ${state.data.notes}` : ""
  );
  await setState(state, { step: "REVIEW", data: { ...state.data } });
  const body = lines(
    summary,
    "",
    `1) Confirm`,
    `${BACK}) Back   •   ${CANCEL}) Cancel`
  );
  await sendWhatsApp({ from: biz.wa.number, to, body });
}

async function finalize({biz, to, from, state}) {
  const services = state.data.services || serviceOptions(biz);
  const svc = services.find(s => s.id === state.data.serviceId)?.raw;

  const booking = await Booking.create({
    businessId: biz._id,
    customerName: state.data.name,
    phoneNumber: from,
    serviceId: svc?._id,
    serviceSnapshot: {
      name: svc?.name || {},
      price: svc?.price || 0,
      duration: svc?.duration || 30
    },
    addonServices: [], // extend later
    date: state.data.date,
    time: state.data.time,
    notes: state.data.notes || "",
    status: "confirmed",
    source: "whatsapp"
  });

  await setState(state, { step: "DONE", data: {} });
  await sendWhatsApp({
    from: biz.wa.number,
    to,
    body: `✅ Booked! #${String(booking._id).slice(-6)}\nSee you on ${state.data.date} at ${state.data.time}.`
  });
}

/* ---------- MAIN WEBHOOK ---------- */
router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const from = body.From?.replace("whatsapp:", "") || "";
    const to   = body.To?.replace("whatsapp:", "") || ""; // this is the business WA number

    // find business by the *receiver* number
    const biz = await Business.findOne({ "wa.number": to, isActive: true }).lean();
    if (!biz) return res.sendStatus(200);

    await upsertCustomer(biz, from);
    const state = await getState(biz, from);

    const text = (body.Body || "").trim();

    // global cancel
    if (text === CANCEL) {
      await setState(state, { step: "SELECT_SERVICE", data: {} });
      await sendWhatsApp({ from: biz.wa.number, to: from, body: "Cancelled. Type *book* to start again." });
      return res.sendStatus(200);
    }

    // entry point: user types "book"
    const normalized = text.toLowerCase();
    if (normalized === "book" || normalized === "احجز" || normalized === "ח予約" || normalized === "حجز") {
      await showServices({biz, to: from, from, state});
      return res.sendStatus(200);
    }

    switch (state.step) {
      case "SELECT_SERVICE": {
        const opts = state.data.services || serviceOptions(biz);
        const picked = pickByIndex(opts, text);
        if (!picked) {
          await showServices({biz, to: from, from, state});
          return res.sendStatus(200);
        }
        await setState(state, { data: { ...state.data, serviceId: picked.id } });
        await showDates({biz, to: from, from, state});
        break;
      }
      case "SELECT_DATE": {
        if (text === BACK) return showServices({biz,to:from,from,state});
        const picked = pickByIndex(state.data.dates||[], text);
        if (!picked) return showDates({biz,to:from,from,state});
        await setState(state, { data: { ...state.data, date: picked.id }});
        await showPeriods({biz,to:from,from,state});
        break;
      }
      case "SELECT_PERIOD": {
        if (text === BACK) return showDates({biz,to:from,from,state});
        const picked = pickByIndex(state.data.periods||[], text);
        if (!picked) return showPeriods({biz,to:from,from,state});
        await setState(state, { data: { ...state.data, period: picked.id }});
        await showTimes({biz,to:from,from,state});
        break;
      }
      case "SELECT_TIME": {
        if (text === BACK) return showPeriods({biz,to:from,from,state});
        const picked = pickByIndex(state.data.times||[], text);
        if (!picked) return showTimes({biz,to:from,from,state});
        await setState(state, { data: { ...state.data, time: picked.id }});
        await collectDetails({biz,to:from,from,state});
        break;
      }
      case "COLLECT_NAME": {
        if (text === BACK) return showTimes({biz,to:from,from,state});
        await setState(state, { step: "COLLECT_NOTES", data: { ...state.data, name: text }});
        await sendWhatsApp({ from: biz.wa.number, to: from, body: lines(
          "Any notes or special requests? (or type '-' for none)",
          "",
          `${BACK}) Back   •   ${CANCEL}) Cancel`
        )});
        break;
      }
      case "COLLECT_NOTES": {
        if (text === BACK) {
          await setState(state, { step: "COLLECT_NAME" });
          await sendWhatsApp({ from: biz.wa.number, to: from, body: lines(
            "Your full name?",
            "",
            `${BACK}) Back   •   ${CANCEL}) Cancel`
          )});
          break;
        }
        const notes = text === "-" ? "" : text;
        await setState(state, { data: { ...state.data, notes }});
        await review({biz,to:from,from,state});
        break;
      }
      case "REVIEW": {
        if (text === BACK) {
          await collectDetails({biz,to:from,from,state});
          break;
        }
        const choice = parseInt(text,10);
        if (choice === 1) await finalize({biz,to:from,from,state});
        else await review({biz,to:from,from,state});
        break;
      }
      default: {
        // unknown → restart
        await showServices({biz,to:from,from,state});
      }
    }

    res.sendStatus(200);
  } catch (e) {
    console.error("Webhook error:", e);
    res.sendStatus(200); // Don't retry
  }
});

module.exports = router;