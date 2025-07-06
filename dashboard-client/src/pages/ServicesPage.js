// Updated with clean classNames and mobile card layout support
import React, { useEffect, useState, useContext } from "react";
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
  const [form, setForm] = useState(emptyService);
  const [editingService, setEditingService] = useState(null);
  const [languageTab, setLanguageTab] = useState(language);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 5;

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
        s.name[languageTab]?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (categoryFilter.trim()) {
      result = result.filter((s) => s.category === categoryFilter);
    }
    setFiltered(result);
    setCurrentPage(1);
  }, [search, categoryFilter, services, languageTab]);

  
  const handleAddService = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("/services", form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setServices([...services, res.data]);
      toast.success(getLabelByLang(translations.servicesPage.serviceAddedSuccessfully, language));
      setForm(emptyService);
    } catch (err) {
      toast.error(getLabelByLang(translations.servicesPage.serviceAddFailed, language));
    }
  };

  const handleEditService = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put(`/services/${editingService._id}`, editingService, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setServices((prev) =>
        prev.map((s) => (s._id === editingService._id ? res.data : s))
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

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const isMobile = window.innerWidth < 768;

  return (
  <div className={`services-page ${["ar", "he"].includes(language) ? "rtl" : "ltr"}`}>

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

      {!isMobile ? (
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
                <td>{s.name[languageTab]}</td>
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
            <div className="row"><strong>{getLabelByLang(translations.servicesPage.name, language)}:</strong> <label>{s.name[languageTab]}</label></div>
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


        <h3 className="service-form-title">  
          {getLabelByLang(translations.servicesPage.addNew, language)}
        </h3>
        <form onSubmit={handleAddService} className="service-form">
          <div className="lang-tabs">
            {["en", "ar", "he"].map((lang) => (
              <button
                type="button"
                key={lang}
                className={languageTab === lang ? "tab active" : "tab"}
                onClick={() => setLanguageTab(lang)}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="modal-field">
            <label className="modal-label">
              {getLabelByLang(translations.servicesPage.name,language)}
            </label>
            <input type="text" className="modal-input" placeholder={`${getLabelByLang(translations.servicesPage.name, language)} (${languageTab})`} value={form.name[languageTab]} onChange={(e) => setForm({ ...form, name: { ...form.name, [languageTab]: e.target.value } })} />
          </div>
          <div className="modal-field">
            <label className="modal-label">
              {getLabelByLang(translations.servicesPage.description,language)}
            </label>
            <textarea className="modal-input-discription" rows={3} placeholder={`${getLabelByLang(translations.servicesPage.description, language)} (${languageTab})`} value={form.description[languageTab]} onChange={(e) => setForm({ ...form, description: { ...form.description, [languageTab]: e.target.value } })} />
          </div>
          <div className="modal-field">
            <label className="modal-label">
              {getLabelByLang(translations.servicesPage.price,language)} 
            </label>
            <input type="number" className="modal-input" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          </div>
          <div className="modal-field">
            <label className="modal-label">
              {getLabelByLang(translations.servicesPage.duration,language)}
            </label>
            <input type="number" className="modal-input" placeholder="Duration (minutes)" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />
          </div>
          <div className="modal-field">
            <label className="modal-label">
              {getLabelByLang(translations.servicesPage.category,language)}
            </label>
            <input type="text" className="modal-input" placeholder={`${getLabelByLang(translations.servicesPage.category, language)}`} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div className="modal-field checkbox">
          <label className="bookable-checkbox">
            {getLabelByLang(translations.servicesPage.bookable, language)}:
          </label>
            <input type="checkbox" className="modal-checkbox" checked={form.bookable} onChange={(e) => setForm({ ...form, bookable: e.target.checked })} />
          </div>
    
          <div className="modal-actions">
            <button type="submit" className="submit-btn">
              {getLabelByLang(translations.servicesPage.addService, language)}
            </button>         
          </div>
        </form>


      {editingService && (
        <div className="modal-overlay">
          <div className="modal-box">
          <div className={`form-wrapper ${["ar", "he"].includes(language) ? "rtl" : "ltr"}`}>
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
                  {getLabelByLang(translations.servicesPage.name,language)}
                </label>                
                <input type="text" className="modal-input" placeholder={`Name (${languageTab})`} value={editingService.name[languageTab]} onChange={(e) => setEditingService({ ...editingService, name: { ...editingService.name, [languageTab]: e.target.value } })} />
              </div>  
              <div className="modal-field">
                <label className="modal-label">
                  {getLabelByLang(translations.servicesPage.description,language)}
                </label>
                 <textarea className="modal-input-discription" rows={3} placeholder={`Description (${languageTab})`} value={editingService.description[languageTab]} onChange={(e) => setEditingService({ ...editingService, description: { ...editingService.description, [languageTab]: e.target.value } })} />                
              </div>  
              <div className="modal-field">
                <label className="modal-label">                  
                  {getLabelByLang(translations.servicesPage.price,language)}
                </label>
                <input type="number" className="modal-input" placeholder="Price" value={editingService.price} onChange={(e) => setEditingService({ ...editingService, price: Number(e.target.value) })} />
              </div>  
              <div className="modal-field">
                <label className="modal-label">                  
                  {getLabelByLang(translations.servicesPage.duration,language)}
                </label>
                <input type="number" className="modal-input" placeholder="Duration" value={editingService.duration} onChange={(e) => setEditingService({ ...editingService, duration: Number(e.target.value) })} />
              </div>  
              <div className="modal-field">
                <label className="modal-label">
                  {getLabelByLang(translations.servicesPage.category,language)}
                </label>
                <input type="text" className="modal-input" placeholder="Category" value={editingService.category} onChange={(e) => setEditingService({ ...editingService, category: e.target.value })} />
              </div>  
              <div className="modal-field checkbox">
                <label className="bookable-checkbox"> 
                  {getLabelByLang(translations.servicesPage.bookable,language)}
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