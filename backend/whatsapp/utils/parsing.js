// utils/parsing.js

function rawText(req) {
  return (req.body?.Body || "").trim();
}

function lower(s) {
  return String(s || "").toLowerCase();
}

/**
 * Parse menu index (1 → 0)
 * Supports Arabic digits
 */
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

  return n - 1;
}

/*  Simple date validator YYYY-MM-DD */
function isDate(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
}

/* Simple time validator HH:mm */

function isTime(s) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s || ""));
}

function isListPickerSelection(payload) {
  try {
    return (
      payload?.Interactive?.Type === "list_reply" ||
      payload?.interactive?.type === "list_reply" ||
      payload?.ListPicker === true
    );
  } catch {
    return false;
  }
}

/*  Extract the selected option ID from Twilio list reply  */
function extractListPickerSelection(payload) {
  // Twilio format 1
  if (payload?.Interactive?.ListReply?.Id) {
    return payload.Interactive.ListReply.Id;
  }

  // Twilio format 2
  if (payload?.interactive?.list_reply?.id) {
    return payload.interactive.list_reply.id;
  }
  return null;
}

module.exports = {
  rawText,
  lower,
  parseMenuIndexFromText,
  isDate,
  isTime,
  isListPickerSelection,
  extractListPickerSelection,
};