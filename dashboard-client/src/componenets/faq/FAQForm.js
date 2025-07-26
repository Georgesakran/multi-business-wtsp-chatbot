import React, { useState, useContext } from "react";
import { toast } from "react-toastify";
import api from "../../services/api";
import translations from "../../translate/translations";
import { getLabelByLang } from "../../translate/getLabelByLang";
import { LanguageContext } from "../../context/LanguageContext";

const initialState = {
  question: { en: "", ar: "", he: "" },
  answer: { en: "", ar: "", he: "" },
};

const FAQForm = ({ businessId, setFaqs }) => {
  const [faq, setFaq] = useState(initialState);
  const { language } = useContext(LanguageContext);

  const handleChange = (lang, field, value) => {
    setFaq((prev) => ({
      ...prev,
      [field]: { ...prev[field], [lang]: value },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/businesses/${businessId}/faqs`, faq);
      setFaqs((prev) => [...prev, res.data]);
      setFaq(initialState);
      toast.success(getLabelByLang(translations.faq.addSuccess, language));
    } catch (err) {
      console.error("Error adding FAQ", err);
      toast.error(getLabelByLang(translations.faq.addFail, language));
    }
  };

  return (
    <form className="faq-form" onSubmit={handleSubmit}>
      <h4>{getLabelByLang(translations.faq.addFaq, language)}</h4>

      {["en", "ar", "he"].map((lang) => (
        <div key={lang}>
          <input
            placeholder={`${getLabelByLang(translations.faq.questionPlaceholder, language)} (${lang})`}
            value={faq.question[lang]}
            onChange={(e) => handleChange(lang, "question", e.target.value)}
          />
          <textarea
            placeholder={`${getLabelByLang(translations.faq.answerPlaceholder, language)} (${lang})`}
            value={faq.answer[lang]}
            onChange={(e) => handleChange(lang, "answer", e.target.value)}
          />
        </div>
      ))}

      <button type="submit">
        {getLabelByLang(translations.faq.submitButton, language)}
      </button>
    </form>
  );
};

export default FAQForm;