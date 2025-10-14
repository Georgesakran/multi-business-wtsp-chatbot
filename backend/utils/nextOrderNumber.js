// utils/nextOrderNumber.js
const Counter = require("../models/Counter");
module.exports = async function nextOrderNumber(businessId) {
  const c = await Counter.findOneAndUpdate(
    { businessId, key: "order" },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return String(c.seq).padStart(6, "0"); // "000123"
};