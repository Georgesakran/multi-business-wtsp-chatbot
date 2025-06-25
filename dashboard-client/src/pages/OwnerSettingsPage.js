// src/pages/OwnerSettingsPage.js
import React from "react";
import BusinessSettings from "../componenets/BusinessSettings"; // adjust path if needed

const OwnerSettingsPage = () => {
  const ownerData = JSON.parse(localStorage.getItem("user")); // or whatever key you used
  const businessId = ownerData?.businessId;

  if (!businessId) {
    return <p>❌ No business ID found. Please log in again.</p>;
  }

  return <BusinessSettings businessId={businessId} />;
};

export default OwnerSettingsPage;