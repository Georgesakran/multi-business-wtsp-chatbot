// src/translate/getLabelByLang.js
export function getLabelByLang(labelObj, lang) {
    switch (lang) {
      case "arabic":
        return labelObj.ar || labelObj.en;
      case "hebrew":
        return labelObj.he || labelObj.en;
      case "english":
      default:
        return labelObj.en;
    }
  }