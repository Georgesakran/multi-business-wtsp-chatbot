const ConversationState = require("../../models/ConversationState");

async function setState(stateDoc, patch) {
  if (!stateDoc) return null;

  if (patch.step) {
    stateDoc.step = patch.step;
  }

  // 🔴 FULL REPLACE MODE
  if (patch.replaceData === true) {
    stateDoc.data = patch.data || {};
  }
  // 🟡 MERGE MODE (default)
  else if (patch.data) {
    stateDoc.data = { ...(stateDoc.data || {}), ...patch.data };
  }

  await stateDoc.save();
  return stateDoc;
}

module.exports = setState;
