const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Business = require("../models/Business");
const Admin = require("../models/Admin");

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { username, password, role = "owner" } = req.body;

  try {
    if (role === "admin") {
      const admin = await Admin.findOne({ username });
      if (!admin) return res.status(401).json({ error: "Invalid admin username" });

      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) return res.status(401).json({ error: "Invalid password" });

      const token = jwt.sign(
        { id: admin._id, username: admin.username, role: "admin" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({ token, user: { role: "admin", username: admin.username } });
    } else {
      const business = await Business.findOne({ username });
      if (!business) return res.status(401).json({ error: "Invalid username" });
      const isMatch = await bcrypt.compare(password, business.password);
      if (!isMatch) return res.status(401).json({ error: "Invalid password" });

      const token = jwt.sign(
        { id: business._id, username: business.username, role: "owner" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({ token, user: { role: "owner", businessId: business._id, username: business.username } });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


router.post('/logout', (req, res) => {
  // Clear the cookie (assuming cookie name is 'token')
  res.clearCookie('token', { path: '/' });
  
  // You can also destroy session if you use express-session
  if (req.session) {
    req.session.destroy();
  }

  return res.status(200).json({ message: 'Logged out successfully' });
});
module.exports = router;