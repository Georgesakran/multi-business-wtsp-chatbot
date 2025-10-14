// src/translate/getLabelByLang.js
export function getLabelByLang(label, language = "en") {
  // String? just return it
  if (typeof label === "string") return label;

  // Nullish or not an object? return empty string
  if (!label || typeof label !== "object") return "";

  // Exact language
  if (label[language]) return label[language];

  // Common fallbacks
  if (label.en) return label.en;
  if (label.he) return label.he;
  if (label.ar) return label.ar;

  // Any value in the object
  const first = Object.values(label).find(Boolean);
  return typeof first === "string" ? first : "";
}