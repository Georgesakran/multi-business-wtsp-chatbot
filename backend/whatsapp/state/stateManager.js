// whatsapp/state/stateManager.js
const ConversationState = require("../../models/ConversationState");
const { error } = require("../utils/logger");

// Create a clean new state
function createEmptyState(businessId, phoneNumber) {
  return {
    businessId,
    phoneNumber,
    step: "MENU",
    data: {},
    updatedAt: new Date(),
  };
}

// Load or create state
async function getState(businessId, phoneNumber) {
  try {
    let state = await ConversationState.findOne({ businessId, phoneNumber });

    if (!state) {
      state = await ConversationState.create(
        createEmptyState(businessId, phoneNumber)
      );
    }

    return state;
  } catch (err) {
    error("❌ getState error:", err);
    throw err;
  }
}

// Update state
async function setState(state, newValues) {
  try {
    state.step = newValues.step ?? state.step;
    state.data = newValues.data ?? state.data;
    state.updatedAt = new Date();
    await state.save();
    return state;
  } catch (err) {
    error("❌ setState error:", err);
    throw err;
  }
}

// Reset completely
async function resetState(businessId, phoneNumber) {
  try {
    const base = createEmptyState(businessId, phoneNumber);
    return await ConversationState.findOneAndUpdate(
      { businessId, phoneNumber },
      base,
      { new: true, upsert: true }
    );
  } catch (err) {
    error("❌ resetState error:", err);
    throw err;
  }
}

module.exports = { getState, setState, resetState };