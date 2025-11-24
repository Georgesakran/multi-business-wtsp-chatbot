const ConversationState = require("../../models/ConversationState");

async function getState({ businessId, phoneNumber }) {
  let doc = await ConversationState.findOne({ businessId, phoneNumber });
  if (!doc) {
    doc = await ConversationState.create({
      businessId,
      phoneNumber,
      step: "LANGUAGE_SELECT",
      data: {},
    });
  }
  return doc;
}

module.exports = getState;
