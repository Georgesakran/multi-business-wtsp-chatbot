const express = require("express");
const router = express.Router();
const Business = require("../models/Business");
const { protect } = require("../middleware/authMiddleware");

// GET all services
router.get("/", protect, async (req, res) => {
  res.json(req.business.services);
});

// ADD a new service
router.post("/", protect, async (req, res) => {
  try {
    const newService = req.body;
    req.business.services.push(newService);
    await req.business.save();
    res.status(201).json(req.business.services[req.business.services.length - 1]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE a service
router.put("/:serviceId", protect, async (req, res) => {
  try {
    const service = req.business.services.id(req.params.serviceId);
    if (!service) return res.status(404).json({ message: "Service not found" });

    Object.assign(service, req.body);
    await req.business.save();
    res.json(service);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE (deactivate) a service
router.delete("/:serviceId", protect, async (req, res) => {
  try {
    const service = req.business.services.id(req.params.serviceId);
    if (!service) return res.status(404).json({ message: "Service not found" });

    service.isActive = false;
    await req.business.save();
    res.json({ message: "Service deactivated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;