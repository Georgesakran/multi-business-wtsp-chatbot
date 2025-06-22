import React from "react";
import "../styles/ConfirmationModal.css";

function ConfirmationModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="confirmation-modal">
      <div className="confirmation-modal-content">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-buttons">
          <button className="confirm-btn" onClick={onConfirm}>Yes</button>
          <button className="cancel-btn" onClick={onCancel}>No</button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;
