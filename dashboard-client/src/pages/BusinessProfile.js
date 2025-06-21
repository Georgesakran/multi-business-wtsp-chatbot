import React, { useState, useEffect } from "react";
import axios from "../services/api";

function BusinessProfile() {
  const [business, setBusiness] = useState(null);
  const [formData, setFormData] = useState({
    businessName: "",
    location: "",
    hours: "",
    language: "arabic",
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;
    fetchBusiness(user.id);
  }, []);

  const fetchBusiness = async (id) => {
    try {
      const res = await axios.get(`/businesses/${id}`);
      setBusiness(res.data);
      setFormData({
        businessName: res.data.businessName,
        location: res.data.location,
        hours: res.data.hours,
        language: res.data.language,
      });
    } catch (err) {
      console.error("Failed to load business", err);
    }
  };

  const handleSave = async () => {
    try {
      await axios.put(`/businesses/${business._id}`, formData);
      alert("✅ Business profile updated!");
    } catch (err) {
      alert("❌ Error updating profile");
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (!business) return <p>Loading...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Business Profile</h2>
      <input name="businessName" value={formData.businessName} onChange={handleChange} /><br /><br />
      <input name="location" value={formData.location} onChange={handleChange} /><br /><br />
      <input name="hours" value={formData.hours} onChange={handleChange} /><br /><br />
      <select name="language" value={formData.language} onChange={handleChange}>
        <option value="arabic">Arabic</option>
        <option value="hebrew">Hebrew</option>
      </select><br /><br />
      <button onClick={handleSave}>Save</button>
    </div>
  );
}

export default BusinessProfile;