const express = require("express");
const router = express.Router();
const mongoose = require("mongoose"); // ✅ FIX: Required for ObjectId
const Business = require("../models/Business");
const Message = require("../models/Message");
const Booking = require("../models/Booking");

const { protect } = require("../middleware/authMiddleware");

// GET /businesses/:id/conversations

// ➜ Return a list of unique phone numbers who messaged the business
router.get("/:id", protect, async (req, res) => {
  const businessId = req.params.id;

  try {
    const messages = await Message.aggregate([
      { $match: { businessId: new mongoose.Types.ObjectId(businessId) } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$customerId",
          lastMessage: { $first: "$content" },
          lastTimestamp: { $first: "$timestamp" },
          lastRole: { $first: "$role" }, // 👈 add this
        },
      },
      { $sort: { lastTimestamp: -1 } }
    ]);

    res.json(messages);
  } catch (err) {
    console.error("❌ Error fetching conversation list", err);
    res.status(500).json({ message: "Server error" });
  }
});
  
  
  // GET /businesses/:id/conversations/:phone
  // ➜ Return full chat thread with that phone
router.get("/:id/:customerId", async (req, res) => {
    const { id, customerId } = req.params;
  
    try {
      const messages = await Message.find({
        businessId: id,
        customerId: customerId,
      }).sort("timestamp");
  
      res.json(messages);
    } catch (err) {
      console.error("❌ Error fetching messages", err);
      res.status(500).json({ message: "Server error" });
    }
  });

module.exports = router;