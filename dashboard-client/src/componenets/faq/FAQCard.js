import React, { useState } from "react";
import { getLabelByLang } from "../../translate/getLabelByLang";

const languageOrder = ["en", "he", "ar"];

const FAQCard = ({ faq, language, onDelete }) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const [langIndex, setLangIndex] = useState(languageOrder.indexOf(language));

  const handlePrev = () => {
    setLangIndex((prev) => (prev === 0 ? languageOrder.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setLangIndex((prev) => (prev + 1) % languageOrder.length);
  };

  return (
    <div className="faq-item">
      {/* Question Row */}
      <div className="faq-question-row">
        <strong className="faq-question-text">{faq.question[language]}</strong>
        <button className="toggle-btn-hide-show" onClick={() => setShowAnswer((prev) => !prev)}>
          {showAnswer
            ? getLabelByLang({ en: "Hide", ar: "إخفاء", he: "הסתר" }, language)
            : getLabelByLang({ en: "Show", ar: "عرض", he: "הצג" }, language)}
        </button>
      </div>

      {/* Answer Section */}
      {showAnswer && (
        <div className="faq-answer">
          <p>{faq.answer[languageOrder[langIndex]]}</p>
          <div className="lan-controls-left-right">
            <button onClick={handlePrev} className="switch-btn-lan">{"<"}</button>
            <small>
              {getLabelByLang({ en: "Language:", ar: "اللغة:", he: "שפה:" }, language)}{" "}
              {languageOrder[langIndex]}
            </small>
            <button onClick={handleNext} className="switch-btn-lan">{">"}</button>
          </div>

          <div className="faq-footer">
            <button onClick={() => onDelete(faq._id)} className="delete-btn-faq">
              {getLabelByLang({ en: "Delete", ar: "حذف", he: "מחק" }, language)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FAQCard;
