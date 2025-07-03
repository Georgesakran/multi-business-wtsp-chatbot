// /src/translate/useTranslate.js
import { useContext } from "react";
import { LanguageContext } from "../context/LanguageContext";

export const useTranslate = () => {
  const { language } = useContext(LanguageContext);
  return (obj) => obj?.[language] || obj?.en || "";
};