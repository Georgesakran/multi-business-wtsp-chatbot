import React from "react";
import { getLabelByLang } from "../../translate/getLabelByLang";
import { toast } from "react-toastify";
import api from "../../services/api";
import translations from "../../translate/translations";
// import { LanguageContext } from "../../context/LanguageContext";

const FAQList = ({ faqs, setFaqs, language, businessId }) => {
    
  const handleDelete = async (id) => {
    try {
      await api.delete(`/businesses/${businessId}/faqs/${id}`);
      setFaqs((prev) => prev.filter((faq) => faq._id !== id));
      toast.success(getLabelByLang(translations.faq.deleteSuccess, language));
    } catch (err) {
      toast.error(getLabelByLang(translations.faq.deleteFail, language));
    }
  };

  return (
    <div className="faq-list">
      <h4>{getLabelByLang(translations.faq.currentFaqs, language)}</h4>
      {faqs.map((faq) => (
        <div key={faq._id} className="faq-item">
          <strong>{getLabelByLang(faq.question, language)}</strong>
          <p>{getLabelByLang(faq.answer, language)}</p>
          <button onClick={() => handleDelete(faq._id)}>
            {getLabelByLang(translations.faq.deleteButton, language)}
          </button>
        </div>
      ))}
    </div>
  );
};

export default FAQList;