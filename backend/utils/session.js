// utils/session.js
exports.isExpired = (updatedAt, ms = 1000 * 60 * 30) => {
  if (!updatedAt) return true;
  return Date.now() - new Date(updatedAt).getTime() > ms;
};