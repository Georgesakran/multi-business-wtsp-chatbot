import React, { useState } from "react";
import { getLabelByLang } from "../../translate/getLabelByLang";
import { toast } from "react-toastify";
import api from "../../services/api";
import translations from "../../translate/translations";
import ConfirmationModal from "../ConfirmationModal";
import FAQCard from "./FAQCard";

const FAQList = ({ faqs, setFaqs, language, businessId }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const confirmDelete = async () => {
    try {
      await api.delete(`/businesses/${businessId}/faqs/${selectedId}`);
      setFaqs((prev) => prev.filter((faq) => faq._id !== selectedId));
      toast.success(getLabelByLang(translations.faq.deleteSuccess, language));
    } catch (err) {
      toast.error(getLabelByLang(translations.faq.deleteFail, language));
    } finally {
      setShowModal(false);
      setSelectedId(null);
    }
  };

  return (
    <div className="faq-list">
      <h4>{getLabelByLang(translations.faq.currentFaqs, language)}</h4>

      {faqs.map((faq) => (
        <FAQCard
          key={faq._id}
          faq={faq}
          language={language}
          onDelete={(id) => {
            setSelectedId(id);
            setShowModal(true);
          }}
        />
      ))}

      {showModal && (
        <ConfirmationModal
          title={
            getLabelByLang(translations.faq.confirmationTitleDelete, language) ||
            "Confirm Delete"
          }
          message={
            getLabelByLang(translations.faq.confirmationMessageDelete, language) ||
            "Are you sure you want to delete this FAQ?"
          }
          onConfirm={confirmDelete}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default FAQList;
