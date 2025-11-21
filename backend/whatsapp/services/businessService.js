// services/businessService.js
const Business = require("../../models/Business");

module.exports = {
  async findByWhatsAppNumber(number) {
    return Business.findOne({ "wa.number": number, isActive: true }).lean();
  },

  async updateChatbotLanguage(businessId, lang) {
    return Business.findByIdAndUpdate(
      businessId,
      { $set: { "config.language": lang } },
      { new: true }
    ).lean();
  },

  async updateChatbotConfig(businessId, patch) {
    return Business.findByIdAndUpdate(
      businessId,
      { $set: { "config": patch } },
      { new: true }
    ).lean();
  },

  getBookingConfig(biz) {
    return biz?.config?.booking || {};
  },

  getMenuItems(biz) {
    return biz?.config?.menuItems || [];
  },

  getLanguage(biz) {
    return biz?.config?.language || biz.language || "english";
  }
};