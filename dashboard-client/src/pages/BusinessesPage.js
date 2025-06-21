import React, { useEffect, useState } from 'react';
import axios from "../services/api";
import reorderDocument from '../context/reOrderDocument';

import '../styles/BusinessesPage.css';

function BusinessesPage() {
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [splitData, setSplitData] = useState([[], [], []]);

  const [isEditing, setIsEditing] = useState(false);
  const [editableBusiness, setEditableBusiness] = useState({});
  const [showDetails, setShowDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const businessesPerPage = 5;

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const response = await axios.get("/businesses");
        // Apply reorderDocument to each item in response.data
        const reordered = response.data.map(doc => reorderDocument(doc));
        setBusinesses(reordered);
      } catch (error) {
        console.error('Error fetching businesses:', error);
      }
    };
  
    fetchBusinesses();
  }, []);
  

  const indexOfLastBusiness = currentPage * businessesPerPage;
  const indexOfFirstBusiness = indexOfLastBusiness - businessesPerPage;
  const currentBusinesses = businesses.slice(indexOfFirstBusiness, indexOfLastBusiness);
  const totalPages = Math.ceil(businesses.length / businessesPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleOpenDetails = (business) => {
    setSelectedBusiness(business);
    setEditableBusiness(business);
    setSplitData(splitBusinessData(business));
    setShowDetails(true);
    setIsEditing(false);
  };

  const handleDoubleClick = (business) => {
    handleOpenDetails(business);
  };

  const handleSave = async () => {
    try {
      await axios.put(`/businesses/${editableBusiness._id}`, editableBusiness);
      const updatedBusinesses = businesses.map(b =>
        b._id === editableBusiness._id ? reorderDocument(editableBusiness) : b
      );
      setBusinesses(updatedBusinesses);
      setSelectedBusiness(reorderDocument(editableBusiness));
      
      setIsEditing(false);
      alert('Business updated successfully!');
    } catch (error) {
      console.error('Error updating business:', error);
      alert('Error saving business. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditableBusiness(selectedBusiness);
    setIsEditing(false);
  };

  const splitBusinessData = (business) => {
    const excludedFields = ['_id', '__v', 'password'];
    const entries = Object.entries(business).filter(([key]) => !excludedFields.includes(key));

    let maxPerColumn;

    if (entries.length > 10) {
      maxPerColumn = 5;
    } else if (entries.length > 8) {
      maxPerColumn = 4;
    } else {
      maxPerColumn = 3;
    }

    const columns = [[], [], []];
    entries.forEach(([key, value], index) => {
      const columnIndex = Math.floor(index / maxPerColumn);
      if (columnIndex < 3) {
        columns[columnIndex].push({ key, value });
      } else {
        columns[2].push({ key, value });
      }
    });

    return columns;
  };

  const renderFieldValue = (key, value) => {
    if (key === 'services') {
      return renderServices(value);
    }

    if (value === null || value === undefined) {
      return '';
    } else if (typeof value === 'object') {
      if (value.name) {
        return value.name;
      }
      return JSON.stringify(value);
    } else if (typeof value === 'string' && value.length > 20) {
      return {
        display: `${value.substring(0, 8)}...${value.substring(value.length - 8)}`,
        fullValue: value,
      };
    } else {
      return value;
    }
  };

  const renderServices = (services) => {
    if (!services || services.length === 0) {
      return isEditing ? <p>No services available. Add one below.</p> : <p>No services available.</p>;
    }

    return (
      <ul className="services-list">
        {services.map((service, index) => (
          <li key={service._id || index} className="service-item">
            {isEditing ? (
              <>
                <input
                  type="text"
                  value={service.name}
                  onChange={(e) => handleServiceChange(index, 'name', e.target.value)}
                  placeholder="Service Name"
                />
                <input
                  type="number"
                  value={service.price}
                  onChange={(e) => handleServiceChange(index, 'price', e.target.value)}
                  placeholder="Price"
                />
                <button onClick={() => handleRemoveService(index)} className="remove-service-btn">🗑️</button>
              </>
            ) : (
              <span>{service.name} - {service.price}</span>
            )}
          </li>
        ))}
      </ul>
    );
  };

  const handleServiceChange = (index, field, value) => {
    const updatedServices = [...editableBusiness.services];
    updatedServices[index] = { ...updatedServices[index], [field]: value };
    setEditableBusiness({ ...editableBusiness, services: updatedServices });
  };

  const handleAddService = () => {
    const updatedServices = [...(editableBusiness.services || []), { name: '', price: '' }];
    setEditableBusiness({ ...editableBusiness, services: updatedServices });
  };

  const handleRemoveService = (index) => {
    const updatedServices = [...editableBusiness.services];
    updatedServices.splice(index, 1);
    setEditableBusiness({ ...editableBusiness, services: updatedServices });
  };

  const handleToggleIsActive = () => {
    setEditableBusiness({ ...editableBusiness, isActive: !editableBusiness.isActive });
  };

  return (
    <div className="businesses-page">
      <h6>All Businesses</h6>
      <table className="business-table">
        <thead>
          <tr>
            <th>Business Name</th>
            <th>Location</th>
            <th>Username</th>
            <th>WhatsApp Number</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {currentBusinesses.map((business) => (
            <tr key={business._id} onDoubleClick={() => handleDoubleClick(business)}>
              <td>{business.nameEnglish}</td>
              <td>{business.location}</td>
              <td>{business.username}</td>
              <td>{business.whatsappNumber}</td>
              <td>
                <span className={business.isActive ? 'status-active' : 'status-inactive'}>
                  {business.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>


      <div className="pagination-container">
        <div className="pagination-summary">
          {businesses.length > 0 && (
            <span>
              Showing {indexOfFirstBusiness + 1} to{" "}
              {Math.min(indexOfLastBusiness, businesses.length)} of {businesses.length} entries
            </span>
          )}
        </div>

        <div className="pagination">
          {currentPage > 1 && (
            <button onClick={() => handlePageChange(currentPage - 1)} className="circle-button">&lt;</button>
          )}

          <button
            onClick={() => handlePageChange(1)}
            className={`circle-button ${currentPage === 1 ? 'active-page' : ''}`}
          >
            1
          </button>

          {currentPage !== 1 && currentPage !== totalPages && (
            <button className="circle-button active-page">{currentPage}</button>
          )}

          {totalPages > 1 && (
            <button
              onClick={() => handlePageChange(totalPages)}
              className={`circle-button ${currentPage === totalPages ? 'active-page' : ''}`}
            >
              {totalPages}
            </button>
          )}

          {currentPage < totalPages && (
            <button onClick={() => handlePageChange(currentPage + 1)} className="circle-button">&gt;</button>
          )}
        </div>
      </div>


      {showDetails && (
        <div className="details-box">
          <div className="details-content">
            <div className="details-header">
              <h2>{selectedBusiness.nameEnglish}</h2>
              <div className="header-buttons">
                {!isEditing && (
                  <button className="edit-button" onClick={() => setIsEditing(true)}>✏️</button>
                )}
                <button className="close-button" onClick={() => setShowDetails(false)}>&times;</button>
              </div>
            </div>

            <div className="details-body">
              {splitData.map((column, columnIndex) => (
                <div className="details-column" key={columnIndex}>
                  {column.map(({ key, value }) => (
                    <div key={key} className="details-field">

                      <div className="field-label">
                        {isEditing ? (
                          <>
                            <label>{formatFieldName(key)}</label>
                            {key === 'services' && (
                              <div className="add-service-btn-container">
                                <button onClick={handleAddService} className="add-service-btn">+</button>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <strong>{formatFieldName(key)}:</strong>
                          </>
                        )}
                      </div>
                      <div className="field-value">
                        {key === 'isActive' ? (
                          isEditing ? (
                            <div className="toggle-container">
                              <span className={editableBusiness.isActive ? 'status-active' : 'status-inactive'}>
                                {editableBusiness.isActive ? 'Active' : 'Inactive'}
                              </span>
                              <label className="switch">
                                <input
                                  type="checkbox"
                                  checked={editableBusiness.isActive}
                                  onChange={handleToggleIsActive}
                                />
                                <span className="slider round"></span>
                              </label>
                            </div>
                          ) : (
                            <span className={selectedBusiness.isActive ? 'status-active' : 'status-inactive'}>
                              {selectedBusiness.isActive ? 'Active' : 'Inactive'}
                            </span>
                          )
                        ) : isEditing && key !== 'services' ? (
                          
                          <input
                            type="text"
                            value={editableBusiness[key]}
                            onChange={(e) =>
                              setEditableBusiness({ ...editableBusiness, [key]: e.target.value })
                            }
                          />
                          
                        ) : renderFieldValue(key, isEditing ? editableBusiness[key] : selectedBusiness[key]) &&
                          typeof renderFieldValue(key, selectedBusiness[key]) === 'object' &&
                          !Array.isArray(selectedBusiness[key]) ? (
                          <>
                            {renderFieldValue(key, selectedBusiness[key]).display}
                            <button
                              className="copy-button"
                              onClick={() =>
                                navigator.clipboard.writeText(renderFieldValue(key, selectedBusiness[key]).fullValue)
                              }
                            >
                              📋
                            </button>
                          </>
                        ) : (
                          renderFieldValue(key, isEditing ? editableBusiness[key] : selectedBusiness[key])
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}

            </div>

            {isEditing && (
              <div className="details-footer">
                <button className="save-button" onClick={handleSave}>Save</button>
                <button className="cancel-button" onClick={handleCancelEdit}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

const formatFieldName = (key) => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase());
};

export default BusinessesPage;
