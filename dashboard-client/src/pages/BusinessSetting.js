import React, { useState } from "react";
import axios from "../services/api";

const BusinessSettings = ({ businessId }) => {
  const [workingDays, setWorkingDays] = useState([]);
  const [openingTime, setOpeningTime] = useState("");
  const [closingTime, setClosingTime] = useState("");
  const [message, setMessage] = useState("");

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const handleToggleDay = (day) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
     await axios.put(`/businesses/update-settings/${businessId}`, {
        workingDays,
        openingTime,
        closingTime
      });
      setMessage("✅ Settings saved successfully");
    } catch (err) {
      setMessage("❌ Error saving settings");
    }
  };

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
        {message && <p>{message}</p>}
      </form>
    </div>
  );
};

export default BusinessSettings;