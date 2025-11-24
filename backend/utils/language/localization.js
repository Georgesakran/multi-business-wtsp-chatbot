/**
 * Safely returns a localized field value.
 * Handles both:
 *  - simple strings
 *  - multilingual objects { en, ar, he }
 */
function getLocalized(field, langKey) {
    if (!field) return "";
  
    // Case 1: field is a string → return as is
    if (typeof field === "string") {
      return field;
    }
  
    // Case 2: field is an object with multiple languages
    if (typeof field === "object") {
      return (
        field[langKey] ||  // requested language
        field.en ||        // fallback order
        field.ar ||
        field.he ||
        ""
      );
    }
  
    return "";
}
  
module.exports = { getLocalized };
  