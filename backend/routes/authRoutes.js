const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Business = require("../models/Business");
const Admin = require("../models/Admin");
const { generateToken } = require("../utils/jwt");

// ========================================
// 🔐 POST /api/auth/login
// ========================================
router.post("/login", async (req, res) => {
  const { username, password, role = "owner" } = req.body;

  try {
    if (role === "admin") {
      const admin = await Admin.findOne({ username });
      if (!admin) return res.status(401).json({ error: "Invalid admin username" });

      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) return res.status(401).json({ error: "Invalid password" });

      const token = generateToken(admin._id, "admin");

      return res.json({
        token,
        user: {
          role: "admin",
          username: admin.username,
        },
      });
    } else {
      const business = await Business.findOne({ username });
      if (!business) return res.status(401).json({ error: "Invalid business username" });

      const isMatch = await bcrypt.compare(password, business.password);
      if (!isMatch) return res.status(401).json({ error: "Invalid password" });

      const token = generateToken(business._id, "owner");

      return res.json({
        token,
        user: {
          role: "owner",
          businessId: business._id,
          username: business.username,
          businessType: business.businessType
        },
        lang :"he",
      });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ========================================
// 🔐 POST /api/auth/logout
// ========================================
router.post("/logout", (req, res) => {
  res.clearCookie("token", { path: "/" });

  if (req.session) {
    req.session.destroy();
  }

  return res.status(200).json({ message: "Logged out successfully" });
});

module.exports = router;