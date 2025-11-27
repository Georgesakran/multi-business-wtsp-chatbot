function parseMenuIndexFromText(txt) {
  if (!txt) return null;

  const arabicZero = "٠".charCodeAt(0);
  const arabicExtZero = "۰".charCodeAt(0);

  let normalized = "";
  for (const ch of txt.trim()) {
    const code = ch.charCodeAt(0);
    if (code >= arabicZero && code <= arabicZero + 9) {
      normalized += String(code - arabicZero);
    } else if (code >= arabicExtZero && code <= arabicExtZero + 9) {
      normalized += String(code - arabicExtZero);
    } else if (/[0-9]/.test(ch)) {
      normalized += ch;
    }
  }

  if (!normalized) return null;
  const n = parseInt(normalized, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n - 1; // index
}
module.exports = parseMenuIndexFromText;