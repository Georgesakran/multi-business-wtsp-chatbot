// state/stateManager.js
const ConversationState = require("../../models/ConversationState");

async function getState({ businessId, phoneNumber }) {
  let doc = await ConversationState.findOne({ businessId, phoneNumber });
  if (!doc) {
    doc = await ConversationState.create({
      businessId,
      phoneNumber,
      step: "LANGUAGE_SELECT",
      data: {}
    });
  }
  return doc;
}

async function setState(stateDoc, patch) {
  if (!stateDoc) return null;

  if (patch.step) stateDoc.step = patch.step;
  if (patch.data)
    stateDoc.data = { ...(stateDoc.data || {}), ...patch.data };

  await stateDoc.save();
  return stateDoc;
}

async function resetState(stateDoc) {
  if (!stateDoc) return;
  stateDoc.step = "LANGUAGE_SELECT";
  stateDoc.data = {};
  await stateDoc.save();
}

module.exports = { getState, setState, resetState };