import React, { useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "./ClientsFilters.css";

// Update props to accept `clients`
const ClientsFilters = ({ onFilterChange, clients }) => {
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    search: ""
  });

  const handleChange = (name, value) => {
    const updated = { ...filters, [name]: value };
    setFilters(updated);
    onFilterChange(updated);
  };

  const handleClearSearch = () => {
    const updated = { ...filters, search: "" };
    setFilters(updated);
    onFilterChange(updated);
  };


  const handleExportToPDF = () => {
    const doc = new jsPDF();
  
    doc.setFontSize(18);
    doc.text("Clients Report", 14, 22);
  
    const tableColumn = ["Name", "Phone", "Email", "Visits", "Last Activity"];
    const tableRows = [];
  
    clients.forEach((c) => {
      tableRows.push([
        c.name || "-",
        c.phoneNumber || "-",
        c.email || "-",
        c.visits || 0,
        c.lastActivity
          ? new Date(c.lastActivity).toLocaleDateString()
          : "-"
      ]);
    });
  
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 10 },
    });
  
    doc.save("clients_report.pdf");
  };

  return (
    <div className="clients-filters">
      {/* Row 1: Date pickers */}
      <div className="filters-row">
        <div className="filter-item">
          <label>Start Date</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleChange("startDate", e.target.value)}
          />
        </div>
        <div className="filter-item">
          <label>End Date</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleChange("endDate", e.target.value)}
          />
        </div>
      </div>

      {/* Row 2: Search + Print */}
      <div className="filters-row">
        <div className="filter-item search-box">
          <label>Search</label>
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Customer name or phone..."
              value={filters.search}
              onChange={(e) => handleChange("search", e.target.value)}
            />
            {filters.search && (
              <button className="clear-btn" onClick={handleClearSearch}>
                ×
              </button>
            )}
          </div>
        </div>
        <div className="filter-item">
          <label>&nbsp;</label>
          <button className="print-btn" onClick={handleExportToPDF}>
            🖨️ Export PDF
          </button>

        </div>
      </div>
    </div>
  );
};

export default ClientsFilters;