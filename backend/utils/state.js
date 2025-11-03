// utils/state.js
const ConversationState = require("../models/ConversationState");

exports.getState = async ({ businessId, phone }) => {
  let doc = await ConversationState.findOne({ businessId, phoneNumber: phone });
  if (!doc) {
    doc = await ConversationState.create({
      businessId,
      phoneNumber: phone,
      step: "SERVICE",
      data: {}
    });
  }
  return doc;
};

exports.setState = async (doc, patch) => {
  Object.assign(doc, patch);
  await doc.save();
  return doc;
};