// services/customerService.js
const Customer = require("../../models/Customer");

module.exports = {
  async getOrCreate(businessId, phone) {
    let c = await Customer.findOne({ businessId, phone }).lean();
    if (c) return c;

    return Customer.create({
      businessId,
      phone,
      language: null,
      stats: { lastSeenAt: new Date() }
    });
  },

  async updateLanguage(businessId, phone, lang) {
    return Customer.findOneAndUpdate(
      { businessId, phone },
      {
        $setOnInsert: { businessId, phone },
        $set: { language: lang, "stats.lastSeenAt": new Date() },
      },
      { new: true, upsert: true }
    ).lean();
  },

  detectLanguage(customer, biz) {
    return (
      customer?.language ||
      biz?.config?.language ||
      biz?.language ||
      "english"
    );
  }
};