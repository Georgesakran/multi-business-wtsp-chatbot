// utils/findOrCreateCustomer.js
const Customer = require("../models/Customer");
module.exports = async function findOrCreateCustomer({ businessId, phone, name, email, language }) {
  if (!businessId || !phone) return null;
  const update = {
    ...(name ? { name } : {}),
    ...(email ? { email } : {}),
    ...(language ? { language } : {}),
    "stats.lastSeenAt": new Date(),
  };
  const c = await Customer.findOneAndUpdate(
    { businessId, phone },
    { $setOnInsert: { businessId, phone }, $set: update },
    { new: true, upsert: true }
  );
  return c;
};