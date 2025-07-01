const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "your_secret_key";

exports.generateToken = (userId, role = "owner") => {
  return jwt.sign({ id: userId, role }, SECRET, { expiresIn: "7d" });
};

exports.verifyToken = (token) => {
  return jwt.verify(token, SECRET);
};