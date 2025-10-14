import React, { useEffect, useState, useContext } from "react";
import "./ClientDetailsModal.css";
import api from "../../services/api";
import { toast } from "react-toastify";
import { LanguageContext } from "../../context/LanguageContext";


const ClientDetailsModal = ({ businessId, phoneNumber, onClose }) => {
    const { language } = useContext(LanguageContext);
  
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
// ClientDetailsModal.jsx
const langToKey = (lng) => {
  const map = { english: "en", arabic: "ar", hebrew: "he", en: "en", ar: "ar", he: "he" };
  return map[lng] || "en";
};

const svcName = (b) => {
  const k = langToKey(language);
  // prefer new schema (serviceSnapshot), fallback to legacy (service)
  return (
    b?.serviceSnapshot?.name?.[k] ||
    b?.serviceSnapshot?.name?.en ||
    b?.service?.[k] ||
    b?.service?.en ||
    "-"
  );
};
  useEffect(() => {
    if (!phoneNumber) return;
    const fetchClientDetails = async () => {
      try {
        const res = await api.get(`/clients/${businessId}/${phoneNumber}`);
        setClient(res.data);
      } catch (err) {
        toast.error("❌ Failed to load client details");
      } finally {
        setLoading(false);
      }
    };
    fetchClientDetails();
  }, [businessId, phoneNumber]);

  if (!phoneNumber) return null;

  return (
    <div className="client-modal-overlay">
      <div className="client-modal-container">
        {/* HEADER */}
        <div className="client-modal-header">
          <h3>👤 {client?.name || "Client Details"}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="client-modal-loading">Loading...</div>
        ) : (
          <div className="client-modal-content">
            {/* BASIC INFO */}
            <div className="client-info-section">
              <p><strong>📞 Phone:</strong> {phoneNumber}</p>
              {client?.email && <p><strong>📧 Email:</strong> {client.email}</p>}
              {client?.tags?.length > 0 && (
                <p><strong>🏷 Tags:</strong> {client.tags.join(", ")}</p>
              )}
              {client?.notes && <p><strong>📝 Notes:</strong> {client.notes}</p>}
            </div>

            {/* BOOKINGS */}
            <div className="history-section">
              <h4>📅 Bookings History</h4>
              {client?.bookings?.length > 0 ? (
                <ul>
                  {client.bookings.map((b, i) => (
                    <li key={i}>
                      <span className="history-date">{b.date}</span> — {svcName(b)} <span className={`status ${b.status.toLowerCase()}`}>({b.status})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-history">No bookings found</p>
              )}
            </div>

            {/* ORDERS */}
            <div className="history-section">
              <h4>🛒 Orders History</h4>
              {client?.orders?.length > 0 ? (
                <ul>
                  {client.orders.map((o, i) => (
                    <li key={i}>
                      <span className="history-date">{o.date}</span> — {o.product} <span className={`status ${o.status.toLowerCase()}`}>({o.status})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-history">No orders found</p>
              )}
            </div>

            {/* QUICK ACTIONS */}
            <div className="client-quick-actions">
              <a href={`tel:${phoneNumber}`} className="action-btn call">📞 Call</a>
              <a href={`https://wa.me/${phoneNumber}`} target="_blank" rel="noopener noreferrer" className="action-btn whatsapp">💬 WhatsApp</a>
              {client?.email && (
                <a href={`mailto:${client.email}`} className="action-btn email">📧 Email</a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDetailsModal;
