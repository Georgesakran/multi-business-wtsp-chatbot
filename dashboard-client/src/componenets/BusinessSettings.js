import React, { useEffect, useState, useContext } from "react";
import axios from "../services/api";
import "../styles/BusinessSettings.css";
import { toast } from "react-toastify";
import { LanguageContext } from "../context/LanguageContext";
import translations from "../translate/translations";
import { getLabelByLang } from "../translate/getLabelByLang";


const BusinessSettings = ({ BusinessId }) => {
  const { language } = useContext(LanguageContext);
  const [workingDays, setWorkingDays] = useState([]);
  const [openingTime, setOpeningTime] = useState("");
  const [closingTime, setClosingTime] = useState("");
  const [loading, setLoading] = useState(true);

  const allDays = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
  ];

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`/businesses/${BusinessId}`);
        const config = res.data.config?.booking || {};

        setWorkingDays(config.workingDays || []);
        setOpeningTime(config.openingTime ?? "");
        setClosingTime(config.closingTime ?? "");
      } catch (err) {
        console.error("❌ Error fetching settings:", err.message);
        toast.error(getLabelByLang(translations.businessSettings.errorLoad, language));
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [BusinessId, language]);

  const handleToggleDay = (day) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (workingDays.length === 0 || !openingTime || !closingTime) {
      return toast.error(getLabelByLang(translations.businessSettings.fillFields, language));
    }

    try {
      await axios.put(`/businesses/update-settings/${BusinessId}`, {
        workingDays,
        openingTime,
        closingTime,
      });
      toast.success(getLabelByLang(translations.businessSettings.success, language));
    } catch (err) {
      toast.error(getLabelByLang(translations.businessSettings.errorSave, language));
    }
  };

  if (loading) return <p>{getLabelByLang(translations.businessSettings.loading, language)}</p>;

  return (

    <div className={`settings-container ${["ar", "he"].includes(language) ? "rtl" : "ltr"}`}>
      <form onSubmit={handleSubmit}>
        <div>
          <label>{getLabelByLang(translations.businessSettings.workingDays, language)}:</label>
          <div className="day-selector">
            {allDays.map((day) => (
              <label key={day}>
                <input
                  type="checkbox"
                  checked={workingDays.includes(day)}
                  onChange={() => handleToggleDay(day)}
                />
                {getLabelByLang(translations.businessSettings.days[day], language)}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label>{getLabelByLang(translations.businessSettings.openingTime, language)}:</label>
          <input
            type="time"
            value={openingTime}
            onChange={(e) => setOpeningTime(e.target.value)}
            required
          />
        </div>

        <div>
          <label>{getLabelByLang(translations.businessSettings.closingTime, language)}:</label>
          <input
            type="time"
            value={closingTime}
            onChange={(e) => setClosingTime(e.target.value)}
            required
          />
        </div>

        <button type="submit">
          {getLabelByLang(translations.businessSettings.saveButton, language)}
        </button>
      </form>
    </div>
  );
};

export default BusinessSettings;