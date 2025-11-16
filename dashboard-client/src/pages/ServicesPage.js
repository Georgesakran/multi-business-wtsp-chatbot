// ServicesPage.jsx
import React, { useEffect, useState, useContext, useRef } from "react";
import { toast } from "react-toastify";
import axios from "../services/api";
import "../styles/ServicesPage.css";
import { LanguageContext } from "../context/LanguageContext";
import translations from "../translate/translations";
import { getLabelByLang } from "../translate/getLabelByLang";

const emptyService = {
  name: { en: "", ar: "", he: "" },
  description: { en: "", ar: "", he: "" },
  price: 0,
  duration: 0,
  category: "",
  bookable: false,
};

const ServicesPage = () => {
  const token = localStorage.getItem("token");
  const { language } = useContext(LanguageContext);
  const [services, setServices] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [editingService, setEditingService] = useState(null);
  const [languageTab, setLanguageTab] = useState(language);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 5;

  // modal state for Add New Service
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState(emptyService);
  const [accordionOpen, setAccordionOpen] = useState({
    name: true,
    description: true,
    other: true,
  });
  const addButtonRef = useRef(null);

  useEffect(() => {
    setLanguageTab(language);
  }, [language]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await axios.get("/services", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setServices(res.data);
        setFiltered(res.data);
      } catch (err) {
        toast.error(getLabelByLang(translations.servicesPage.fetchError, language));
      }
    };
    fetchServices();
  }, [token, language]);

  useEffect(() => {
    let result = services;
    if (search.trim()) {
      result = result.filter((s) =>
        (s.name?.[languageTab] || "").toLowerCase().includes(search.toLowerCase())
      );
    }
    if (categoryFilter.trim()) {
      result = result.filter((s) => s.category === categoryFilter);
    }
    setFiltered(result);
    setCurrentPage(1);
  }, [search, categoryFilter, services, languageTab]);

  const handleEditService = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put(`/services/${editingService._id}`, editingService, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setServices((prev) =>
        prev.map((s) => (s._id === editingService._1 ? res.data : s))
      );
      setEditingService(null);
      toast.success(getLabelByLang(translations.servicesPage.serviceUpdatedSuccessfully, language));
    } catch (err) {
      toast.error(getLabelByLang(translations.servicesPage.serviceUpdatedFailed, language));
    }
  };

  const handleToggleActive = async (id) => {
    const service = services.find((s) => s._id === id);
    const updated = { ...service, isActive: !service.isActive };
    try {
      const res = await axios.put(`/services/${id}`, updated, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setServices((prev) => prev.map((s) => (s._id === id ? res.data : s)));
      toast.success(getLabelByLang(translations.servicesPage.serviceStatusUpdatedSuccessfully, language));
    } catch (err) {
      toast.error(getLabelByLang(translations.servicesPage.serviceStatusToggleFailed, language));
    }
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  // Modal helpers
  useEffect(() => {
    // disable body scroll when modal open
    document.body.style.overflow = addModalOpen ? "hidden" : "";
    if (!addModalOpen && addButtonRef.current) addButtonRef.current.focus();
    return () => {
      document.body.style.overflow = "";
    };
  }, [addModalOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && addModalOpen) {
        closeAddModal();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addModalOpen]);

  const openAddModal = () => {
    setModalForm(emptyService);
    setAccordionOpen({ name: true, description: true, other: true });
    setAddModalOpen(true);
  };

  const closeAddModal = () => {
    setAddModalOpen(false);
  };

  // validation: require all name & description fields to be non-empty
  const isModalValid = () => {
    const nf = modalForm.name || {};
    const df = modalForm.description || {};
    const allNames = [nf.en, nf.ar, nf.he].every((v) => String(v || "").trim().length > 0);
    const allDescs = [df.en, df.ar, df.he].every((v) => String(v || "").trim().length > 0);
    return allNames && allDescs;
  };

  const handleSaveNewService = async (e) => {
    e.preventDefault();
    if (!isModalValid()) {
      toast.error(getLabelByLang(translations.servicesPage.fillAllLanguagesError, language) || "Please fill all languages.");
      return;
    }

    try {
      const res = await axios.post("/services", modalForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setServices((prev) => [res.data, ...prev]);
      setFiltered((prev) => [res.data, ...prev]);
      closeAddModal();
      toast.success(getLabelByLang(translations.servicesPage.serviceAddedSuccessfully, language));
    } catch (err) {
      console.error(err);
      toast.error(getLabelByLang(translations.servicesPage.serviceAddFailed, language));
    }
  };

  // small util: set nested fields safely
  const setModalNested = (path, value) => {
    // path like "name.en" or "description.ar"
    const [k, sub] = path.split(".");
    setModalForm((prev) => ({ ...prev, [k]: { ...prev[k], [sub]: value } }));
  };

  const isRtl = ["ar", "he"].includes(language);

  return (
    <div className={`services-page ${isRtl ? "rtl" : "ltr"}`}>
      <div className="top-controls">
        <div className="filters-container">
          <input
            type="text"
            placeholder={`${getLabelByLang(translations.servicesPage.searchPlaceholder, language)} (${languageTab})`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input
            type="text"
            placeholder={getLabelByLang(translations.servicesPage.filterCategory, language)}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          />
        </div>

        <div className="service-page-actions">
          <button
            ref={addButtonRef}
            className="primary-btn"
            onClick={openAddModal}
            aria-haspopup="dialog"
          >
            {getLabelByLang(translations.servicesPage.addNew, language)}
          </button>
        </div>
      </div>

      {/* Table / Card List */}
      <div className="list-wrapper">
        {window.innerWidth >= 768 ? (
          <table className="services-table">
            <thead>
              <tr>
                <th>{getLabelByLang(translations.servicesPage.name, language)}</th>
                <th>{getLabelByLang(translations.servicesPage.price, language)}</th>
                <th>{getLabelByLang(translations.servicesPage.duration, language)}</th>
                <th>{getLabelByLang(translations.servicesPage.status, language)}</th>
                <th>{getLabelByLang(translations.servicesPage.bookable, language)}</th>
                <th>{getLabelByLang(translations.servicesPage.actions, language)}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((s) => (
                <tr key={s._id}>
                  <td>{s.name?.[languageTab] || ""}</td>
                  <td>{s.price} ₪</td>
                  <td>{s.duration} min</td>
                  <td>
                    <span className={s.isActive ? "badge green" : "badge red"}>
                      {getLabelByLang(translations.servicesPage[s.isActive ? "active" : "inactive"], language)}
                    </span>
                  </td>
                  <td>{getLabelByLang(translations.servicesPage[s.bookable ? "true" : "false"], language)}</td>
                  <td>
                    <button className="edit-btn" onClick={() => setEditingService(s)}>
                      {getLabelByLang(translations.servicesPage.edit, language)}
                    </button>
                    <button className="toggle-btn" onClick={() => handleToggleActive(s._id)}>
                      {getLabelByLang(translations.servicesPage.toggle, language)}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="card-list">
            {paginated.map((s) => (
              <div key={s._id} className="card">
                <div className="row"><strong>{getLabelByLang(translations.servicesPage.name, language)}:</strong> <label>{s.name?.[languageTab] || ""}</label></div>
                <div className="divider"></div>
                <div className="row"><strong>{getLabelByLang(translations.servicesPage.price, language)}:</strong><label> {s.price} ₪</label></div>
                <div className="divider"></div>
                <div className="row"><strong>{getLabelByLang(translations.servicesPage.duration, language)}:</strong> <label>{s.duration} min</label></div>
                <div className="divider"></div>
                <div className="row"><strong>{getLabelByLang(translations.servicesPage.status, language)}:</strong>
                  <span className={s.isActive ? "badge green" : "badge red"}>
                    {getLabelByLang(translations.servicesPage[s.isActive ? "active" : "inactive"], language)}
                  </span>
                </div>
                <div className="divider"></div>
                <div className="row"><strong>{getLabelByLang(translations.servicesPage.bookable, language)}:</strong> <label>{getLabelByLang(translations.servicesPage[s.bookable ? "true" : "false"], language)}</label></div>
                <div className="divider"></div>
                <div className="row">
                  <button className="edit-btn" onClick={() => setEditingService(s)}>{getLabelByLang(translations.servicesPage.edit, language)}</button>
                  <button className="toggle-btn" onClick={() => handleToggleActive(s._id)}>{getLabelByLang(translations.servicesPage.toggle, language)}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="pagination">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            className={n === currentPage ? "active" : ""}
            onClick={() => setCurrentPage(n)}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Add New Service Modal (Full-screen) */}
      {addModalOpen && (
        <div className="fs-modal" role="dialog" aria-modal="true" aria-label="Add New Service Modal">
          <div className={`modal-header ${isRtl ? "rtl" : "ltr"}`}>
            <h3>{getLabelByLang(translations.servicesPage.addNew, language)}</h3>
            <button
            type="button"
            onClick={closeAddModal}
            className="icon-btn"
            aria-label="Close"
          >
            ✖
          </button>          </div>

          <form className="fs-modal-body" onSubmit={handleSaveNewService}>
            {/* Accordion: Name */}
            <div className={`accordion ${accordionOpen.name ? "open" : ""}`}>
              <button
                type="button"
                className="accordion-toggle"
                onClick={() => setAccordionOpen((p) => ({ ...p, name: !p.name }))}
              >
                {getLabelByLang(translations.servicesPage.name, language)}
                <span className="chev">{accordionOpen.name ? "▾" : "▸"}</span>
              </button>

              <div className="accordion-content">
                <div className="triple-inputs">
                  <label>
                    EN
                    <input
                      value={modalForm.name.en}
                      onChange={(e) => setModalNested("name.en", e.target.value)}
                      placeholder="Name (EN)"
                      dir="ltr"
                    />
                  </label>
                  <label>
                    AR
                    <input
                      value={modalForm.name.ar}
                      onChange={(e) => setModalNested("name.ar", e.target.value)}
                      placeholder="الاسم (AR)"
                      dir="rtl"
                    />
                  </label>
                  <label>
                    HE
                    <input
                      value={modalForm.name.he}
                      onChange={(e) => setModalNested("name.he", e.target.value)}
                      placeholder="שם (HE)"
                      dir="rtl"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Accordion: Description */}
            <div className={`accordion ${accordionOpen.description ? "open" : ""}`}>
              <button
                type="button"
                className="accordion-toggle"
                onClick={() => setAccordionOpen((p) => ({ ...p, description: !p.description }))}
              >
                {getLabelByLang(translations.servicesPage.description, language)}
                <span className="chev">{accordionOpen.description ? "▾" : "▸"}</span>
              </button>

              <div className="accordion-content">
                <div className="triple-textareas">
                  <label>
                    EN
                    <textarea
                      value={modalForm.description.en}
                      onChange={(e) => setModalNested("description.en", e.target.value)}
                      placeholder="Description (EN)"
                      rows={3}
                      dir="ltr"
                    />
                  </label>
                  <label>
                    AR
                    <textarea
                      value={modalForm.description.ar}
                      onChange={(e) => setModalNested("description.ar", e.target.value)}
                      placeholder="الوصف (AR)"
                      rows={3}
                      dir="rtl"
                    />
                  </label>
                  <label>
                    HE
                    <textarea
                      value={modalForm.description.he}
                      onChange={(e) => setModalNested("description.he", e.target.value)}
                      placeholder="תיאור (HE)"
                      rows={3}
                      dir="rtl"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Accordion: Other fields */}
            <div className={`accordion ${accordionOpen.other ? "open" : ""}`}>
              <button
                type="button"
                className="accordion-toggle"
                onClick={() => setAccordionOpen((p) => ({ ...p, other: !p.other }))}
              >
                {getLabelByLang(translations.servicesPage.details || "Details", language)}
                <span className="chev">{accordionOpen.other ? "▾" : "▸"}</span>
              </button>

              <div className="accordion-content">
                <div className="two-cols">
                  <label>
                    {getLabelByLang(translations.servicesPage.price, language)}
                    <input
                      type="number"
                      min="0"
                      value={modalForm.price}
                      onChange={(e) => setModalForm((p) => ({ ...p, price: Number(e.target.value) }))}
                    />
                  </label>

                  <label>
                    {getLabelByLang(translations.servicesPage.duration, language)}
                    <input
                      type="number"
                      min="0"
                      value={modalForm.duration}
                      onChange={(e) => setModalForm((p) => ({ ...p, duration: Number(e.target.value) }))}
                    />
                  </label>
                </div>

                <div className="two-cols">
                <label>
                  {getLabelByLang(translations.servicesPage.category, language)}
                  <input 
                    type="text"
                    value={modalForm.category}
                    onChange={(e) => setModalForm((p) => ({ ...p, category: e.target.value }))}
                  />
                </label>

                <label className="checkbox-row">
                {getLabelByLang(translations.servicesPage.bookable, language)}
                  <input
                    type="checkbox"
                    checked={modalForm.bookable}
                    onChange={(e) => setModalForm((p) => ({ ...p, bookable: e.target.checked }))}
                  />
                                 ( {getLabelByLang(translations.servicesPage.bookableLabel, language)})

                </label>

                </div>

              </div>
            </div>

            {/* Validation hint */}
            {!isModalValid() && (
              <div className="validation-hint">
                {getLabelByLang(translations.servicesPage.fillAllLanguagesHint, language) ||
                  "Please fill all name and description fields in EN, AR and HE to enable Save."}
              </div>
            )}
            

            {/* Actions */}
            <div className="modal-courses-btns-actions">
              <button
                className="cancel-btn-course-page"
                onClick={closeAddModal}
                aria-label="Cancel"
              >
              {getLabelByLang(translations.servicesPage.cancel, language)}

              </button>
            <button type="submit"
              className="submit-btn-course-page"
              disabled={!isModalValid()}
            >
              {getLabelByLang(translations.servicesPage.save, language)}
            </button>
          </div>
          </form>
        </div>
      )}

      {/* existing edit modal (unchanged) */}
      {editingService && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className={`form-wrapper ${isRtl ? "rtl" : "ltr"}`}>
              <h3 className="modal-title">Edit Service</h3>
              <form onSubmit={handleEditService} className="modal-form">
                <div className="lang-tabs">
                  {["en", "ar", "he"].map((lang) => (
                    <button
                      type="button"
                      key={lang}
                      className={languageTab === lang ? "active" : ""}
                      onClick={() => setLanguageTab(lang)}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="modal-field">
                  <label className="modal-label">
                    {getLabelByLang(translations.servicesPage.name, language)}
                  </label>
                  <input type="text" className="modal-input" placeholder={`Name (${languageTab})`} value={editingService.name[languageTab]} onChange={(e) => setEditingService({ ...editingService, name: { ...editingService.name, [languageTab]: e.target.value } })} />
                </div>
                <div className="modal-field">
                  <label className="modal-label">
                    {getLabelByLang(translations.servicesPage.description, language)}
                  </label>
                  <textarea className="modal-input-discription" rows={3} placeholder={`Description (${languageTab})`} value={editingService.description[languageTab]} onChange={(e) => setEditingService({ ...editingService, description: { ...editingService.description, [languageTab]: e.target.value } })} />
                </div>
                <div className="modal-field">
                  <label className="modal-label">
                    {getLabelByLang(translations.servicesPage.price, language)}
                  </label>
                  <input type="number" className="modal-input" placeholder="Price" value={editingService.price} onChange={(e) => setEditingService({ ...editingService, price: Number(e.target.value) })} />
                </div>
                <div className="modal-field">
                  <label className="modal-label">
                    {getLabelByLang(translations.servicesPage.duration, language)}
                  </label>
                  <input type="number" className="modal-input" placeholder="Duration" value={editingService.duration} onChange={(e) => setEditingService({ ...editingService, duration: Number(e.target.value) })} />
                </div>

                <div className="modal-field">
                  <label className="modal-label">
                    {getLabelByLang(translations.servicesPage.category, language)}
                  </label>
                  <input type="text" className="modal-input" placeholder="Category" value={editingService.category} onChange={(e) => setEditingService({ ...editingService, category: e.target.value })} />
                </div>

                <div className="modal-field checkbox">
                  <label className="bookable-checkbox">
                    {getLabelByLang(translations.servicesPage.bookable, language)}
                  </label>
                  <input type="checkbox" className="modal-checkbox" checked={editingService.bookable} onChange={(e) => setEditingService({ ...editingService, bookable: e.target.checked })} />
                </div>
                <div className="modal-actions">
                  <button className="save-btn-edit-service">
                    {getLabelByLang(translations.servicesPage.save, language)}
                  </button>
                  <button
                    className="cancel-btn-edit-service"
                    onClick={() => setEditingService(null)}
                    type="button"
                  >
                    {getLabelByLang(translations.servicesPage.cancel, language)}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesPage;
