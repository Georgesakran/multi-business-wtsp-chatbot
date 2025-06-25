import React, { useState } from "react";
import "../styles/AddBusiness.css";

const AddBusinessPage = () => {
  const [form, setForm] = useState({
    username: "",
    password: "",
    nameEnglish: "",
    nameArabic: "",
    nameHebrew: "",
    whatsappNumber: "",
    language: "arabic",
    businessType: "booking", // default type
    enabledServices: [],     // multiple services
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleServiceToggle = (service) => {
    const updated = form.enabledServices.includes(service)
      ? form.enabledServices.filter(s => s !== service)
      : [...form.enabledServices, service];
    setForm({ ...form, enabledServices: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch("http://localhost:5001/api/admin/NewBusiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Business added successfully");
        setForm({
          username: "",
          password: "",
          nameEnglish: "",
          nameArabic: "",
          nameHebrew: "",
          whatsappNumber: "",
          language: "arabic",
          businessType: "booking",
          enabledServices: [],
        });
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setMessage("❌ Server error");
    }
  };

  return (
    <div className="add-business-container">
      <h2>Add New Business</h2>
      <form onSubmit={handleSubmit} className="add-business-form">

        <input name="username" value={form.username} onChange={handleChange} placeholder="Username" required />
        <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Password" required />

        <input name="nameEnglish" value={form.nameEnglish} onChange={handleChange} placeholder="Name (English)" />
        <input name="nameArabic" value={form.nameArabic} onChange={handleChange} placeholder="Name (Arabic)" />
        <input name="nameHebrew" value={form.nameHebrew} onChange={handleChange} placeholder="Name (Hebrew)" />

        <input name="whatsappNumber" value={form.whatsappNumber} onChange={handleChange} placeholder="WhatsApp Number" />

        <select name="language" value={form.language} onChange={handleChange}>
          <option value="arabic">Arabic</option>
          <option value="hebrew">Hebrew</option>
          <option value="english">English</option>
        </select>

        <select name="businessType" value={form.businessType} onChange={handleChange}>
          <option value="booking">Booking-Based</option>
          <option value="product">Product-Based</option>
          <option value="info">Info / Customer Support</option>
          <option value="mixed">Mixed Type</option>
          <option value="event">Event & Ticketing</option>
          <option value="delivery">Delivery / Orders</option>
        </select>

        <label>Enabled Services:</label>
        <div className="services-checkbox-group">
          {["bookingFlow", "productCatalog", "customerSupport", "eventRSVP", "deliveryRequest", "generalQuestions"].map(service => (
            <label key={service}>
              <input
                type="checkbox"
                checked={form.enabledServices.includes(service)}
                onChange={() => handleServiceToggle(service)}
              />
              {service}
            </label>
          ))}
        </div>

        <button type="submit">Add Business</button>
      </form>

      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default AddBusinessPage;