// models/Counter.js
const mongoose = require("mongoose");

const CounterSchema = new mongoose.Schema({
    businessId: { type: mongoose.Schema.Types.ObjectId, index: true, required: true },
    key: { type: String, index: true, required: true }, // e.g. "order"
    seq: { type: Number, default: 0 }
  }, { versionKey:false });
  
  CounterSchema.index({ businessId:1, key:1 }, { unique: true });
  module.exports = mongoose.model("Counter", CounterSchema);