const jwt = require("jsonwebtoken");
const Business = require("../models/Business");
const Admin = require("../models/Admin");

const SECRET = process.env.JWT_SECRET || "your_secret_key";

// 🔐 Middleware: Auth Protect for Both Admin & Owner
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, SECRET);

    req.user = {
      id: decoded.id,
      role: decoded.role
    };

    // 🛡️ Load the correct user model
    if (decoded.role === "admin") {
      const admin = await Admin.findById(decoded.id);
      if (!admin) return res.status(401).json({ message: "Unauthorized: Admin not found" });
      req.admin = admin;
    } else if (decoded.role === "owner") {
      const business = await Business.findById(decoded.id);
      if (!business) return res.status(401).json({ message: "Unauthorized: Business not found" });
      req.business = business;
    } else {
      return res.status(403).json({ message: "Unauthorized: Unknown role" });
    }

    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
  }
};

module.exports = { protect };