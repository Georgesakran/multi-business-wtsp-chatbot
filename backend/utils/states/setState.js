const ConversationState = require("../../models/ConversationState");

async function setState(stateDoc, patch) {
  if (!stateDoc) return null;
  if (patch.step) stateDoc.step = patch.step;
  if (patch.data) {
    stateDoc.data = { ...(stateDoc.data || {}), ...patch.data };
  }
  await stateDoc.save();
  return stateDoc;
}

module.exports = setState;
