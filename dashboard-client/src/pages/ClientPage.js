import React, { useEffect, useState } from "react";
import api from "../services/api";
import ClientsTable from "../componenets/client/ClientsTable";
import ClientsFilters from "../componenets/client/ClientsFilters";
import ClientDetailsModal from "../componenets/client/ClientDetailsModal";
import "../styles/ClientsPage.css";
import { toast } from "react-toastify";

const ClientsPage = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const businessId = user.businessId;

  const [clients, setClients] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    search: ""
  });
  const [businessProfile, setBusinessProfile] = useState(null); // NEW

  // Fetch business profile
  const fetchBusinessProfile = async () => {
    try {
      const res = await api.get(`/businesses/${businessId}`);
      setBusinessProfile(res.data);
    } catch (err) {
      toast.error("❌ Failed to load business profile");
    }
  };

  // Fetch clients
  const fetchClients = async (appliedFilters = filters) => {
    try {
      const query = new URLSearchParams({
        startDate: appliedFilters.startDate || "",
        endDate: appliedFilters.endDate || "",
        search: appliedFilters.search || ""
      });
      const res = await api.get(`/clients/${businessId}?${query.toString()}`);
      setClients(res.data);
    } catch (err) {
      toast.error("❌ Failed to load clients");
    }
  };

  useEffect(() => {
    fetchBusinessProfile();
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    fetchClients(newFilters);
  };

  return (
    <div className="clients-page">
      {businessProfile && (
        <ClientsFilters
          onFilterChange={handleFilterChange}
          clients={clients}
          businessNameHebrew={businessProfile.nameHebrew || "שם העסק"} // pass safely
        />
      )}
      <ClientsTable
        clients={clients}
        onSelectClient={(phoneNumber) => setSelectedPhone(phoneNumber)}
      />
      {selectedPhone && (
        <ClientDetailsModal
          businessId={businessId}
          phoneNumber={selectedPhone}
          onClose={() => setSelectedPhone(null)}
        />
      )}
    </div>
  );
};

export default ClientsPage;
