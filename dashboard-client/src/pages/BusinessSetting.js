import React, { useEffect, useState } from "react";
import axios from "../services/api";

const BusinessSettings = ({ businessId }) => {
  const [workingDays, setWorkingDays] = useState([]);
  const [openingTime, setOpeningTime] = useState("");
  const [closingTime, setClosingTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // ✅ Fetch settings on load
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`/businesses/${businessId}`);
        const config = res.data.config?.booking || {};

        setWorkingDays(config.workingDays || []);
        setOpeningTime(config.openingTime ?? "");
        setClosingTime(config.closingTime ?? "");
      } catch (err) {
        console.error("❌ Error fetching settings:", err.message);
        setMessage("❌ Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [businessId]);

  const handleToggleDay = (day) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (workingDays.length === 0 || !openingTime || !closingTime) {
      return setMessage("❌ Please fill all fields (days and hours)");
    }

    try {
      await axios.put(`/businesses/update-settings/${businessId}`, {
        workingDays,
        openingTime,
        closingTime,
      });
      setMessage("✅ Settings saved successfully");
    } catch (err) {
      console.error("❌ Error saving:", err.message);
      setMessage("❌ Error saving settings");
    }
  };

  if (loading) return <p>⏳ Loading settings...</p>;

  return (
    <div className="settings-container">
      <h2>Business Settings</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Working Days:</label>
          <div className="day-selector">
            {daysOfWeek.map((day) => (
              <label key={day}>
                <input
                  type="checkbox"
                  checked={workingDays.includes(day)}
                  onChange={() => handleToggleDay(day)}
                />
                {day}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label>Opening Time:</label>
          <input
            type="time"
            value={openingTime}
            onChange={(e) => setOpeningTime(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Closing Time:</label>
          <input
            type="time"
            value={closingTime}
            onChange={(e) => setClosingTime(e.target.value)}
            required
          />
        </div>

        <button type="submit">Save Settings</button>
        {message && <p style={{ color: message.startsWith("✅") ? "green" : "red" }}>{message}</p>}
      </form>
    </div>
  );
};

export default BusinessSettings;