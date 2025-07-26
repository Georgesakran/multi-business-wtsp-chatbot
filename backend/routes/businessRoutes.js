const express = require("express");
const router = express.Router();
const Business = require("../models/Business");
const Message = require("../models/Message");
const Booking = require("../models/Booking");

const { protect } = require("../middleware/authMiddleware");

// Only allow admin to list all businesses
router.get("/", protect, async (req, res) => {
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
router.get("/:id", protect,async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ error: "Not found" });

    // Ensure default structure to prevent frontend crash
    if (!business.config) business.config = {};
    if (!business.config.booking) business.config.booking = {};
    if (!business.config.booking.workingDays) business.config.booking.workingDays = [];
    if (!business.config.booking.openingTime) business.config.booking.openingTime = "";
    if (!business.config.booking.closingTime) business.config.booking.closingTime = "";

    res.json(business);
  } catch (err) {
    console.error("❌ Failed to fetch business:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});
  
  
  // PUT /api/businesses/:id - Update business info
router.put('/:id', protect,async (req, res) => {
    try {
      const business = await Business.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(business);
    } catch (err) {
      res.status(500).json({ error: 'Update failed' });
    }
});

  // PUT /api/businesses/:id - Update business settings working days and hours
router.put("/update-settings/:id", protect,async (req, res) => {
  try {
    const businessId = req.params.id;
    const { workingDays, openingTime, closingTime } = req.body;

    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ error: "Business not found" });

    business.config.booking.workingDays = workingDays;
    business.config.booking.openingTime = openingTime;
    business.config.booking.closingTime = closingTime;

    await business.save();
    res.status(200).json({ message: "Settings updated", business });
  } catch (err) {
    console.error("Update settings error:", err);
    res.status(500).json({ error: "Server error" });
  }
});




// GET /api/businesses/:id/chatbot-config
router.get("/:id/chatbot-config", protect, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ error: "Business not found" });

    // Ensure default config structure
    if (!business.config) business.config = {};
    if (!business.config.chatbotEnabled) business.config.chatbotEnabled = false;
    if (!business.config.features) business.config.features = {};
    if (!business.config.systemPrompt) business.config.systemPrompt = "";
    if (!business.config.language) business.config.language = "en";

    // ✅ Send both config and _id
    res.status(200).json({
      _id: business._id,
      config: business.config,
    });
  } catch (err) {
    console.error("❌ Failed to fetch chatbot config:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});


// ✅ Update chatbotEnabled toggle
router.put("/:id/update-chatbot", protect, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ message: "Business not found" });

    // Only update the allowed chatbot config fields
    if (req.body.hasOwnProperty("chatbotEnabled")) {
      business.config.chatbotEnabled = req.body.chatbotEnabled;
    }

    if (req.body.hasOwnProperty("features")) {
      business.config.features = {
        ...business.config.features,
        ...req.body.features,
      };
    }

    if (req.body.hasOwnProperty("systemPrompt")) {
      business.config.systemPrompt = req.body.systemPrompt;
    }

    if (req.body.hasOwnProperty("language")) {
      business.config.language = req.body.language;
    }
    if (req.body.hasOwnProperty("welcomeMessage")) {
      business.config.welcomeMessage = req.body.welcomeMessage;
    }
    
    if (req.body.hasOwnProperty("fallbackMessage")) {
      business.config.fallbackMessage = req.body.fallbackMessage;
    }
    
  
    await business.save();
    res.status(200).json(business.config);
  } catch (err) {
    console.error("❌ Error updating chatbot config:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// GET /api/businesses/:id/chatbot-usage
router.get("/:id/chatbot-usage", protect, async (req, res) => {
  try {
    const businessId = req.params.id;

    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ error: "Business not found" });

    const fallbackMessage = business.config?.fallbackMessage || "";

    // 📊 All-time stats
    const totalMessagesAllTime = await Message.countDocuments({ businessId });
    const botRepliesAllTime = await Message.countDocuments({ businessId, role: "assistant" });
    const chatbotBookingsAllTime = await Booking.countDocuments({ businessId, source: "chatbot" });
    const lastMessage = await Message.findOne({ businessId }).sort({ timestamp: -1 });

    const fallbackCount = await Message.countDocuments({
      businessId,
      role: "assistant",
      content: fallbackMessage,
    });

    res.status(200).json({
      totalMessages: totalMessagesAllTime,
      botReplies: fallbackCount, // This replaces the botReplies stat with "failures"
      chatbotBookings: chatbotBookingsAllTime,
      lastActive: lastMessage?.timestamp || null,
    });
  } catch (err) {
    console.error("❌ Failed to get chatbot usage stats:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});



// 📘 Get all FAQs
router.get("/:id/faqs", protect, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ error: "Business not found" });

    res.json(business.faqs || []);
  } catch (err) {
    console.error("❌ Failed to fetch FAQs:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ➕ Add new FAQ
router.post("/:id/faqs", protect, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ error: "Business not found" });

    const newFaq = {
      question: req.body.question,
      answer: req.body.answer,
      createdAt: new Date()
    };

    business.faqs.push(newFaq);
    await business.save();

    res.status(201).json(business.faqs[business.faqs.length - 1]); // return last added
  } catch (err) {
    console.error("❌ Failed to add FAQ:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 🗑️ Delete FAQ by ID
router.delete("/:id/faqs/:faqId", protect, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ error: "Business not found" });

    business.faqs = business.faqs.filter((faq) => faq._id.toString() !== req.params.faqId);
    await business.save();

    res.json({ message: "FAQ deleted" });
  } catch (err) {
    console.error("❌ Failed to delete FAQ:", err);
    res.status(500).json({ error: "Server error" });
  }
});





module.exports = router;