import React, { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import AlefBase64 from "../../fonts/Alef-Regular-base64"; // adjust path

import { toast } from "react-toastify";
import "./ClientsFilters.css";

// Accept `clients` as prop
const ClientsFilters = ({ onFilterChange, clients, businessNameHebrew }) => {
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



  
  const handleExportToPDF = (e) => {
    e.preventDefault();
  
    const nameHe = businessNameHebrew || "שם העסק";
  
    if (!clients || clients.length === 0) {
      toast.error("❌ No clients to export");
      return;
    }
  
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const today = new Date().toLocaleDateString();
  
    // Add Alef font
    doc.addFileToVFS("Alef-Regular.ttf", AlefBase64);
    doc.addFont("Alef-Regular.ttf", "Alef", "normal");
  
    const logo = new Image();
    logo.src = "/logo_png-noback.png";
   
    logo.onload = () => {
      // --- HEADER ---
      doc.addImage(logo, "PNG", 14, 10, 25, 25);
  
      // Date top-right
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`Date: ${today}`, pageWidth - 14, 18, { align: "right" });
  
      // Business name centered
      doc.setFont("Alef", "normal");
      doc.setFontSize(18);
      doc.setTextColor(30);
      doc.text(nameHe.split("").reverse().join(""), pageWidth / 2, 25, { align: "center" });
  
      // Horizontal line under header
      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(14, 37.5, pageWidth - 14, 37.5);
  
      // --- TITLE + FILTER BOX ---
      const clientsX = 14;
      const clientsY = 50;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(41, 128, 185);
      doc.text("Clients", clientsX, clientsY);
  
      const start = filters.startDate ? new Date(filters.startDate).toLocaleDateString() : null;
      const end = filters.endDate ? new Date(filters.endDate).toLocaleDateString() : null;
      const filterText = start && end ? `From ${start} to ${end}` : "All Time";
  
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(255);
  
      // Draw filter box nicely beside "Clients"
      const paddingX = 6;
      //const paddingY = 3;
      const filterWidth = doc.getTextWidth(filterText) + paddingX * 2;
      const filterHeight = 8;
      const filterX = clientsX + 25; // beside "Clients"
      const filterY = clientsY - 6;
  
      doc.setDrawColor(52, 152, 219);
      doc.setLineWidth(0.5);
      doc.setFillColor(52, 152, 219);
      doc.roundedRect(filterX, filterY + 0.8, filterWidth, filterHeight, 2, 2, "F");
  
      doc.setTextColor(255);
      doc.text(filterText, filterX + paddingX, filterY + filterHeight - 2);
  
      // --- TABLE ---
      const tableColumn = ["Name", "Phone", "Email", "Visits", "Last Activity"];
      const tableRows = clients.map(c => [
        c.name ? c.name.split("").reverse().join("") : "-",
        c.phoneNumber || "-",
        c.email || "-",
        c.visits || 0,
        c.lastActivity ? new Date(c.lastActivity).toLocaleDateString() : "-"
      ]);
  
      const marginLeft = 14;
      const marginRight = 14;
      const usableWidth = pageWidth - marginLeft - marginRight;
  
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 58,
        styles: {
          font: "Alef",
          fontSize: 10,
          cellPadding: 4,
          textColor: 40,
          overflow: 'linebreak', // wrap long text
        },
        headStyles: {
          fillColor: [52, 152, 219],
          textColor: 255,
          fontStyle: "bold",
          font: "Alef"
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 'auto' }
        },
        tableWidth: usableWidth, // set total table width
        margin: { left: marginLeft, right: marginRight },
        didDrawPage: () => {
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(10);
          doc.setTextColor(120);
          doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: "center" }
          );
        }
      });
      
  
      doc.save("clients_report.pdf");
    };
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
          <button type="button" className="print-btn" onClick={handleExportToPDF}>
            🖨️ Export PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientsFilters;
