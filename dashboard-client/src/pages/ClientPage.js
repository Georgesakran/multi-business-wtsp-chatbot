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
  const [selectedPhone,setSelectedPhone] = useState(null);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    search: ""
  });

  // Fetch clients from API
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

  // On page load
  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  // When filters change
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    fetchClients(newFilters);
  };
  return (
    <div className="clients-page">
      {/*<h2>👥 Clients</h2>

       Filters above table */}
      <ClientsFilters onFilterChange={handleFilterChange} clients={clients} />

      {/* Table */}
      <ClientsTable clients={clients} onSelectClient={(phoneNumber) => setSelectedPhone(phoneNumber)} />
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