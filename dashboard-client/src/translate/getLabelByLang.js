// src/translate/getLabelByLang.js
export function getLabelByLang(labelObj, lang) {
    switch (lang) {
      case "ar":
        return labelObj.ar || labelObj.en;
      case "he":
        return labelObj.he || labelObj.en;
      case "en":
      default:
        return labelObj.en;
    }
  }