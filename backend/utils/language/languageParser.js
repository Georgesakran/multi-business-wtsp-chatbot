function parseLanguageChoice(txt) {
    const t = lower(txt);
    // numbers
    if (t === "1") return "arabic";
    if (t === "2") return "english";
    if (t === "3") return "hebrew";
  
    // labels (accept many variants)
    if (["العربية", "ar", "arabic", "arabic 🇸🇦"].includes(t)) return "arabic";
    if (["english", "en", "english 🇬🇧", "english 🇺🇸"].includes(t)) return "english";
    if (["עברית", "hebrew", "he"].includes(t)) return "hebrew";
  
    return null;
  }
module.exports = {parseLanguageChoice};