// services/customerService.js
const Customer = require("../../models/Customer");

module.exports = {
  async getOrCreateCustomer(businessId, phone) {
    if (!businessId || !phone) throw new Error("Missing businessId or phone");

    let customer = await Customer.findOne({ businessId, phone });

    if (!customer) {
      customer = await Customer.create({
        businessId,
        phone,
        language: "english", // default language
        stats: { lastSeenAt: new Date() }
      });
      return customer;
    }

    // update last seen
    customer.stats = customer.stats || {};
    customer.stats.lastSeenAt = new Date();
    await customer.save();

    return customer;
  },

  /**
   * Update customer language
   */
  async setLanguage(businessId, phone, lang) {
    return await Customer.findOneAndUpdate(
      { businessId, phone },
      { language: lang, "stats.lastSeenAt": new Date() },
      { new: true }
    );
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