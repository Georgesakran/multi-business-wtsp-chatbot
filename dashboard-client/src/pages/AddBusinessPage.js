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
        phoneNumberId: "",
        language: "arabic",
        verifyToken: "",
        accessToken: "",
      });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
          phoneNumberId: "",
          language: "arabic",
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
            <input name="phoneNumberId" value={form.phoneNumberId} onChange={handleChange} placeholder="Phone Number ID" />

            <input name="verifyToken" value={form.verifyToken} onChange={handleChange} placeholder="Verify Token" />
            <input name="accessToken" value={form.accessToken} onChange={handleChange} placeholder="Access Token" />

            <select name="language" value={form.language} onChange={handleChange}>
                <option value="arabic">Arabic</option>
                <option value="hebrew">Hebrew</option>
                <option value="english">English</option>
            </select>

            <button type="submit">Add Business</button>
        </form>

      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default AddBusinessPage;