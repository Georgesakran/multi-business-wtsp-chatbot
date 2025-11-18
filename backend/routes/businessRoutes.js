const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
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
  

// PUT /api/business/:id/profile - Update business profile securely
router.put("/:id/profile", protect, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ error: "Business not found" });

    const {
      nameEnglish,
      nameArabic,
      nameHebrew,
      owner,
      location,
      password
    } = req.body;

    // Update profile fields
    if (nameEnglish !== undefined) business.nameEnglish = nameEnglish;
    if (nameArabic !== undefined) business.nameArabic = nameArabic;
    if (nameHebrew !== undefined) business.nameHebrew = nameHebrew;

    if (owner) {
      business.owner.fullName = owner.fullName || "";
      business.owner.phone = owner.phone || "";
      business.owner.email = owner.email || "";
    }

    if (location) {
      business.location.city = location.city || "";
      business.location.street = location.street || "";
    }

    // If password is provided, hash and update
    if (password && password.trim().length > 0) {
      const bcrypt = require("bcryptjs");
      const salt = await bcrypt.genSalt(10);
      business.password = await bcrypt.hash(password, salt);
    }

    await business.save();
    res.json({ message: "✅ Profile updated successfully" });
  } catch (err) {
    console.error("❌ Failed to update profile:", err);
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

    // Ensure config object
    if (!business.config) business.config = {};

    // Basic defaults
    if (typeof business.config.chatbotEnabled !== "boolean") {
      business.config.chatbotEnabled = false;
    }
    if (!business.config.features) business.config.features = {};
    if (!business.config.systemPrompt) business.config.systemPrompt = "";
    if (!business.config.language) business.config.language = "arabic"; // must match enum

    // ✅ NEW: ensure booking config exists
    if (!business.config.booking) {
      business.config.booking = {};
    }
    if (
      !["pending", "confirmed"].includes(
        business.config.booking.chatbotDefaultStatus
      )
    ) {
      business.config.booking.chatbotDefaultStatus = "pending";
    }

    // ✅ Ensure messages structure exists
    if (!business.config.messages) {
      business.config.messages = {};
    }

    const emptyLang = {
      welcome_first: "",
      welcome_returning: "",
      fallback: "",
      main_menu: "",
    };

    const ensureLang = (code) => {
      business.config.messages[code] = {
        ...emptyLang,
        ...(business.config.messages[code] || {}),
      };
    };

    ensureLang("ar");
    ensureLang("en");
    ensureLang("he");

    // ✅ Ensure menuItems exists (array)
    if (!Array.isArray(business.config.menuItems)) {
      business.config.menuItems = [];
    }

    // (optional) persist defaults
    await business.save();

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


// ✅ Update chatbot config (toggles + messages)
router.put("/:id/update-chatbot", protect, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ message: "Business not found" });

    const {
      chatbotEnabled,
      features,
      systemPrompt,
      language,
      welcomeMessage,
      fallbackMessage,
      messages,
      menuItems,   // existing
      booking,     // ✅ NEW
    } = req.body;

    // 1) old fields (for backward compatibility)
    if (typeof chatbotEnabled === "boolean") {
      business.config.chatbotEnabled = chatbotEnabled;
    }

    if (features && typeof features === "object") {
      business.config.features = {
        ...business.config.features,
        ...features,
      };
    }

    if (typeof systemPrompt === "string") {
      business.config.systemPrompt = systemPrompt;
    }

    if (typeof language === "string") {
      business.config.language = language;
    }

    if (typeof welcomeMessage === "string") {
      business.config.welcomeMessage = welcomeMessage;
    }

    if (typeof fallbackMessage === "string") {
      business.config.fallbackMessage = fallbackMessage;
    }

    // 2) NEW multi-language messages
    if (messages && typeof messages === "object") {
      business.config.messages = {
        ...(business.config.messages || {}),
        ...messages,
      };
    }

    // 3) NEW: menuItems array
    if (Array.isArray(menuItems)) {
      business.config.menuItems = menuItems;
    }

    // 4) ✅ NEW: booking-related config (including chatbotDefaultStatus)
    if (booking && typeof booking === "object") {
      if (!business.config.booking) business.config.booking = {};

      business.config.booking = {
        ...business.config.booking,
        ...booking,
      };
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


// PUT /api/businesses/:id/password
router.put("/:id/password", protect, async (req, res) => {
  const businessId = req.params.id;
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // Validate input
  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "New passwords do not match" });
  }

  try {
    // Fetch the business by ID
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    // Check if the current password matches
    const isMatch = await bcrypt.compare(currentPassword, business.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the password using findByIdAndUpdate
    await Business.findByIdAndUpdate(businessId, { password: hashedPassword });

    res.status(200).json({ message: "✅ Password updated successfully" });
  } catch (err) {
    console.error("Error updating password:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});



router.put('/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    await Business.findByIdAndUpdate(req.params.id, { password: hashed });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

module.exports = router;