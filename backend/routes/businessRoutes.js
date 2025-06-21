const express = require("express");
const router = express.Router();
const Business = require("../models/Business");
const auth = require("../middleware/authMiddleware");

// Only allow admin to list all businesses
router.get("/", auth, async (req, res) => {
  try {
    if (req.user.username !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const businesses = await Business.find();
    res.json(businesses);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/businesses/:id - Get single business
router.get('/:id', async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ error: 'Not found' });
    res.json(business);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
  
  
  // PUT /api/businesses/:id - Update business info
router.put('/:id', async (req, res) => {
    try {
      const business = await Business.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(business);
    } catch (err) {
      res.status(500).json({ error: 'Update failed' });
    }
});

module.exports = router;