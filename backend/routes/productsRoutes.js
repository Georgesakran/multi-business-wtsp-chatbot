const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const { protect } = require("../middleware/authMiddleware");

// Helpers
const buildSort = (sortBy = "createdAt_desc") => {
  const [f, dir] = sortBy.split("_");
  const map = { createdAt: "createdAt", price: "price", name: "name", stock: "stock" };
  const key = map[f] || "createdAt";
  return { [key]: dir === "asc" ? 1 : -1 };
};

// POST /products
router.post("/", protect, async (req, res) => {
  try {
    const { businessId, name, price, stock } = req.body;
    if (!businessId || !name) return res.status(400).json({ message: "Missing required fields" });
    const saved = await Product.create(req.body);
    res.status(201).json(saved);
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

// GET /products (filters + pagination)
router.get("/", protect, async (req, res) => {
  try {
    const {
      businessId, q, sku, category, status, stockMin, stockMax,
      priceMin, priceMax, sortBy = "createdAt_desc", page = 1, limit = 10
    } = req.query;

    if (!businessId) return res.status(400).json({ message: "Missing businessId" });

    const filter = { businessId };

    if (q) filter.name = { $regex: q, $options: "i" };
    if (sku) filter.sku = { $regex: sku, $options: "i" };
    if (category) filter.category = { $regex: category, $options: "i" };
    if (status && status !== "any") filter.status = status;

    if (priceMin || priceMax) {
      filter.price = {};
      if (priceMin) filter.price.$gte = Number(priceMin);
      if (priceMax) filter.price.$lte = Number(priceMax);
    }
    if (stockMin || stockMax) {
      filter.stock = {};
      if (stockMin) filter.stock.$gte = Number(stockMin);
      if (stockMax) filter.stock.$lte = Number(stockMax);
    }

    const _page = Math.max(1, parseInt(page));
    const _limit = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (_page - 1) * _limit;

    const sort = buildSort(sortBy);

    const [items, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(_limit).lean(),
      Product.countDocuments(filter)
    ]);

    res.json({ items, total, page: _page, limit: _limit });
  } catch (e) { console.error(e); res.status(500).json({ message: "Failed to fetch products" }); }
});

// GET /products/:id
router.get("/:id", protect, async (req, res) => {
  const doc = await Product.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json(doc);
});

// PUT /products/:id
router.put("/:id", protect, async (req, res) => {
  const updated = await Product.findOneAndUpdate(
    { _id: req.params.id, businessId: req.body.businessId || req.query.businessId },
    { $set: req.body }, { new: true, runValidators: true }
  );
  if (!updated) return res.status(404).json({ message: "Not found" });
  res.json(updated);
});

// DELETE /products/:id
router.delete("/:id", protect, async (req, res) => {
  const deleted = await Product.findOneAndDelete({ _id: req.params.id, businessId: req.query.businessId });
  if (!deleted) return res.status(404).json({ message: "Not found" });
  res.json({ message: "Product deleted" });
});

// GET /products/bulk?businessId=...&ids=a,b,c
router.get("/bulk", protect, async (req, res) => {
  try {
    const { businessId, ids } = req.query;
    if (!businessId) return res.status(400).json({ message: "Missing businessId" });
    if (!ids) return res.json({ items: [] });

    const arr = String(ids)
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    // Make sure they are valid ObjectIds
    const { Types } = require("mongoose");
    const objectIds = arr
      .map(id => (Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null))
      .filter(Boolean);

    const items = await Product.find({
      businessId,
      _id: { $in: objectIds }
    })
      .select("_id name sku price image") // include image
      .lean();

    return res.json({ items });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to fetch products in bulk" });
  }
});

module.exports = router;