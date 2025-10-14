import React, { useEffect, useState, useCallback } from "react";
import "../styles/BusinessProfilePage.css";
import api from "../services/api";
import { toast } from "react-toastify";

const BusinessProfilePage = () => {
  const [loading, setLoading] = useState(true); // ⬅️ NEW state
  const user = JSON.parse(localStorage.getItem("user"));
  const businessId = user.businessId;
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [dashboardLang , setDashbaordLang] = useState("");
  const [form, setForm] = useState({
    nameEnglish: "",
    nameArabic: "",
    nameHebrew: "",
    owner: { fullName: "", phone: "", email: "" },
    location: { city: "", street: "" },
    username: "",
    password: "",
  });
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [qrUrl, setQrUrl] = useState("");

  const fetchProfile = useCallback (async () => {
    try {
      setLoading(true);
      const res = await api.get(`/businesses/${businessId}`);
      setForm({
        nameEnglish: res.data.nameEnglish,
        nameArabic: res.data.nameArabic,
        nameHebrew: res.data.nameHebrew,
        owner: res.data.owner || {},
        location: res.data.location || {},
        username: res.data.username,
        password: res.data.password,
      });
  
      setWhatsappNumber(res.data.whatsappNumber);
      setQrUrl(`https://wa.me/${res.data.whatsappNumber}`);
      const storedLang = localStorage.getItem("lang") || "en";
      setDashbaordLang(storedLang);
    } catch (err) {
      toast.error("❌ Failed to load profile");
    } finally {
      setLoading(false);
    }
  } ,[businessId]);
  
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]); // ✅ include businessId in deps
  

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.includes("owner.")) {
      setForm((prev) => ({
        ...prev,
        owner: { ...prev.owner, [name.split(".")[1]]: value },
      }));
    } else if (name.includes("location.")) {
      setForm((prev) => ({
        ...prev,
        location: { ...prev.location, [name.split(".")[1]]: value },
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/businesses/${businessId}/profile`, form);
      toast.success("✅ Profile updated successfully");
      fetchProfile(); // ← refresh form state from server
    } catch (err) {
      toast.error("❌ Failed to update profile");
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return toast.error("❌ Please fill all password fields");
    }
  
    if (newPassword !== confirmPassword) {
      return toast.error("❌ New passwords do not match");
    }
  
    try {
      await api.put(`/businesses/${businessId}/password`, {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      toast.success("✅ Password updated successfully");
      // Reset fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);
    } catch (err) {
      toast.error("❌ Failed to update password: " + err.response?.data?.message || "");
    }
  };

  return (
    <div className="profile-page">
      {loading ? (
      <div className="loading-container">
        <p>⏳ Loading profile...</p>
      </div>
    ) : (
      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-section">
          <h2 className="section-title-profile">Business Details</h2>
          <label>Business Name (EN)</label>
          <input name="nameEnglish" value={form.nameEnglish} onChange={handleChange} />

          <label>Business Name (AR)</label>
          <input name="nameArabic" value={form.nameArabic} onChange={handleChange} />

          <label>Business Name (HE)</label>
          <input name="nameHebrew" value={form.nameHebrew} onChange={handleChange} />

          <label>City</label>
          <input name="location.city" value={form.location.city} onChange={handleChange} />

          <label>Street</label>
          <input name="location.street" value={form.location.street} onChange={handleChange} />

 
        </div>

        <div className="form-section">
            <h2 className="section-title-profile">Owner Details</h2>
          <label>Owner Full Name</label>
          <input name="owner.fullName" value={form.owner.fullName} onChange={handleChange} />

          <label>Owner Phone</label>
          <input name="owner.phone" value={form.owner.phone} onChange={handleChange} />

          <label>Owner Email</label>
          <input name="owner.email" value={form.owner.email} onChange={handleChange} />
        </div>

        <div className="form-section">
            <h2 className="section-title-profile">LOGIN Details</h2>

            <div className="login-row">
                <label>Username</label>
                
                <button
                    type="button"
                    className="show-password-btn"
                    onClick={() => setShowPasswordSection(!showPasswordSection)}
                    >
                    🔒 Change Password
                </button>

            </div>
            <input value={form.username} disabled readOnly />

            {showPasswordSection && (
                <>
                    <label>Current Password</label>
                    <input
                    type="password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    />

                    <label>New Password</label>
                    <input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    />

                    <label>Confirm New Password</label>
                    <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button type="button" onClick={handlePasswordChange}>
                    ✅ Update Password
                    </button>
                </>
            )}


            <label>Dashboard Language</label>
            <select
                name="dashboardLang"
                value={dashboardLang}
                onChange={(e) => {
                setDashbaordLang(e.target.value);
                localStorage.setItem("lang", e.target.value);
                }}
            >
                <option value="ar">Arabic</option>
                <option value="he">Hebrew</option>
                <option value="en">English</option>
            </select>

        </div>

        <div className="form-section">

          <h2 className="section-title-profile">WhatsApp Details</h2>
          <label>WhatsApp Number</label>
          <input value={whatsappNumber} readOnly disabled />

          <label>Chatbot Link</label>

          <a href={qrUrl} target="_blank" rel="noopener noreferrer">
            {qrUrl}
          </a>

          {qrUrl && (
          <img
            className="qr-image"
            src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
              qrUrl
            )}&size=150x150`}
            alt="QR Code"
          />
        )}


        </div>

        <button type="submit">💾 Save Changes</button>
      </form>
    )}
    </div>
        );
  
};

export default BusinessProfilePage;