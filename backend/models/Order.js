const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  name: { type: String, required: true },
  sku: String,
  imageUrl: String,
  price: { type: Number, required: true, min: 0 },
  qty: { type: Number, required: true, min: 1 }
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },

  number: { type: String, index: true }, // human readable, optional auto-seq
  status: { type: String, enum: ["pending", "paid", "fulfilled", "cancelled", "refunded"], default: "pending", index: true },

  paymentStatus: { type: String, enum: ["unpaid", "paid", "refunded", "partial"], default: "unpaid", index: true },
  paymentMethod: { type: String, enum: ["cash", "card", "transfer", "link", "other"], default: "other" },

  customer: {
    name: { type: String, trim: true, index: true },
    phone: { type: String, trim: true, index: true },
    whatsapp: { type: String, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true }
  },

  items: { type: [OrderItemSchema], default: [] },

  totals: {
    subtotal: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    shipping: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0, index: true }
  },

  notes: { type: String, trim: true, default: "" },
  customerNote: { type: String, trim: true, default: "" },

  meta: { type: Object, default: {} }
}, { timestamps: true, versionKey: false });

OrderSchema.index({ businessId: 1, "customer.name": 1, "customer.phone": 1 });
OrderSchema.index({ businessId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Order", OrderSchema);