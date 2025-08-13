import React, { useEffect, useState, useContext } from "react";
import axios from "../services/api";
import "../styles/FaqPage.css";
import FAQForm from "../componenets/faq/FAQForm";
import FAQList from "../componenets/faq/FAQList";
import { LanguageContext } from "../context/LanguageContext";
// import { getLabelByLang } from "../translate/getLabelByLang";
// import translations from "../translate/translations";

const FaqPage = () => {
  const { language } = useContext(LanguageContext);
  const [faqs, setFaqs] = useState([]);
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const res = await axios.get(`/businesses/${user.businessId}/faqs`);
        setFaqs(res.data);
      } catch (err) {
        console.error("❌ Failed to load FAQs", err);
      }
    };
    fetchFaqs();
  }, [user.businessId]);

  return (
    
    <div className={`faq-page ${["ar", "he"].includes(language) ? "rtl" : "ltr"}`}>
      {/* <h2>{getLabelByLang(translations.faq.pageTitle, language)}</h2> */}
      <div className="faq-page-row">
        <FAQForm businessId={user.businessId} setFaqs={setFaqs} />
        <FAQList
          faqs={faqs}
          setFaqs={setFaqs}
          language={language}
          businessId={user.businessId}
        />
      </div>
    </div>
  );
};

export default FaqPage;