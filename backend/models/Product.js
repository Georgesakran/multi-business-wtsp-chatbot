const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema({
  public_id: String,
  secure_url: String,   // prefer this in the frontend
  url: String,          // non-secure (optional)
  width: Number,
  height: Number,
  format: String,
  alt: String
}, { _id: false });

const ProductSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", index: true, required: true },

  name: { type: String, required: true, trim: true, index: true },
  sku: { type: String, trim: true, index: true },
  category: { type: String, trim: true, index: true },
  status: { type: String, enum: ["active", "archived"], default: "active", index: true },

  price: { type: Number, min: 0, default: 0, index: true },
  cost: { type: Number, min: 0, default: 0 },
  stock: { type: Number, min: 0, default: 0, index: true },
  reorderLevel: { type: Number, min: 0, default: 0 },

  description: { type: String, trim: true, default: "" },

  image: ImageSchema,   // <-- add this
}, { timestamps: true, versionKey: false });

ProductSchema.index({ businessId: 1, name: 1 });
ProductSchema.index({ businessId: 1, category: 1 });
ProductSchema.index({ businessId: 1, status: 1, stock: 1 });

module.exports = mongoose.model("Product", ProductSchema);