// routes/orderRoutes.js
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const Order = require("../models/Order");
const Product = require("../models/Product"); // your file is Products.js → model name "Product"

const nextOrderNumber = require("../utils/nextOrderNumber"); // Phase 2.1
const findOrCreateCustomer = require("../utils/findOrCreateCustomer"); // Phase 2.2

/* --------------------------------
   Helpers
----------------------------------*/
const buildSort = (sortBy = "createdAt_desc") => {
  const [f, dir] = String(sortBy).split("_");
  const map = { createdAt: "createdAt", total: "totals.total", status: "status", number: "number" };
  const key = map[f] || "createdAt";
  return { [key]: dir === "asc" ? 1 : -1 };
};

const sanitizeItems = (items = []) => {
  return items
    .filter((it) => it && (it.name?.trim() || it.productId) && Number(it.qty) > 0)
    .map((it) => ({
      productId: it.productId ? new mongoose.Types.ObjectId(it.productId) : undefined,
      name: String(it.name || "").trim(),
      sku: it.sku ? String(it.sku).trim() : undefined,
      imageUrl: it.imageUrl || undefined,
      price: Number(it.price || 0),
      qty: Number(it.qty || 1),
    }));
};

/* --------------------------------
   POST /orders  (create)
   - generates sequential number if not provided
   - links/creates Customer record (Phase 2.2)
----------------------------------*/
router.post("/", protect, async (req, res) => {
  try {
    const {
      businessId,
      items = [],
      totals = {},
      status,
      paymentStatus,
      paymentMethod,
      customer = {},
      notes,
      customerNote,
      number, // optional override
      meta,
    } = req.body;

    if (!businessId) return res.status(400).json({ message: "Missing businessId" });

    const cleanItems = sanitizeItems(items);
    if (cleanItems.length === 0)
      return res.status(400).json({ message: "Order must have at least one valid item" });

    if (totals?.total == null)
      return res.status(400).json({ message: "Missing totals.total" });

    // 1) link or create customer (by phone)
    let linkedCustomer = null;
    if (customer?.phone) {
      linkedCustomer = await findOrCreateCustomer({
        businessId,
        phone: customer.phone,
        name: customer.name,
        email: customer.email,
        language: customer.language,
      });
    }

    // 2) get next order number if not provided
    const finalNumber = number || (await nextOrderNumber(businessId));

    // 3) create the order
    const payload = {
      businessId,
      number: finalNumber,
      status: status || "pending",
      paymentStatus: paymentStatus || "unpaid",
      paymentMethod: paymentMethod || "other",
      customer: {
        name: customer?.name || "",
        phone: customer?.phone || "",
        whatsapp: customer?.whatsapp || "",
        email: customer?.email || "",
        address: customer?.address || "",
      },
      items: cleanItems,
      totals: {
        subtotal: Number(totals.subtotal || 0),
        discount: Number(totals.discount || 0),
        shipping: Number(totals.shipping || 0),
        tax: Number(totals.tax || 0),
        total: Number(totals.total || 0),
      },
      notes: notes || "",
      customerNote: customerNote || "",
      meta: meta || {},
    };

    const saved = await Order.create(payload);

    // 4) bump simple customer stats (if we have one)
    if (linkedCustomer) {
      await linkedCustomer.updateOne({ $inc: { "stats.orders": 1 } }).exec();
    }

    return res.status(201).json(saved);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
});

/* --------------------------------
   GET /orders  (list + filters)
----------------------------------*/
router.get("/", protect, async (req, res) => {
  try {
    const {
      businessId, q, status, paymentStatus, dateFrom, dateTo,
      totalMin, totalMax, sortBy = "createdAt_desc", page = 1, limit = 10
    } = req.query;

    if (!businessId) return res.status(400).json({ message: "Missing businessId" });

    const filter = { businessId };

    if (status && status !== "any") filter.status = status;
    if (paymentStatus && paymentStatus !== "any") filter.paymentStatus = paymentStatus;

    if (q) {
      const r = new RegExp(String(q), "i");
      filter.$or = [
        { number: r },
        { "customer.name": r },
        { "customer.phone": r },
      ];
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    if (totalMin || totalMax) {
      filter["totals.total"] = {};
      if (totalMin) filter["totals.total"].$gte = Number(totalMin);
      if (totalMax) filter["totals.total"].$lte = Number(totalMax);
    }

    const _page = Math.max(1, parseInt(page));
    const _limit = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (_page - 1) * _limit;
    const sort = buildSort(sortBy);

    const [items, total] = await Promise.all([
      Order.find(filter).sort(sort).skip(skip).limit(_limit).lean(),
      Order.countDocuments(filter),
    ]);

    res.json({ items, total, page: _page, limit: _limit });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

/* --------------------------------
   GET /orders/:id  (detail)
----------------------------------*/
router.get("/:id", protect, async (req, res) => {
  const doc = await Order.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json(doc);
});

/* --------------------------------
   PUT /orders/:id  (update metadata)
----------------------------------*/
router.put("/:id", protect, async (req, res) => {
  const updated = await Order.findOneAndUpdate(
    { _id: req.params.id, businessId: req.body.businessId || req.query.businessId },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!updated) return res.status(404).json({ message: "Not found" });
  res.json(updated);
});

/* --------------------------------
   DELETE /orders/:id
----------------------------------*/
router.delete("/:id", protect, async (req, res) => {
  const deleted = await Order.findOneAndDelete({ _id: req.params.id, businessId: req.query.businessId });
  if (!deleted) return res.status(404).json({ message: "Not found" });
  res.json({ message: "Order deleted" });
});

/* --------------------------------
   BULK helper: GET /orders/bulk?businessId=...&ids=1,2,3
   (looks like you used this for products; leaving it here for compatibility)
----------------------------------*/
router.get("/bulk", protect, async (req, res) => {
  try {
    const { businessId, ids } = req.query;
    if (!businessId) return res.status(400).json({ message: "Missing businessId" });
    if (!ids) return res.json({ items: [] });

    const idArr = String(ids).split(",").map((s) => s.trim()).filter(Boolean);
    const objectIds = idArr
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    if (objectIds.length === 0) return res.json({ items: [] });

    const items = await Product.find({ businessId, _id: { $in: objectIds } })
      .select("_id name sku price image")
      .lean();

    res.json({ items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Bulk fetch failed" });
  }
});

module.exports = router;