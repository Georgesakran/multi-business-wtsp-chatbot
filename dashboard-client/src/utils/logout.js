// src/utils/logout.js
import axios from "../services/api";

export const handleLogout = async (navigate) => {
  try {
    // Call backend logout route
    await axios.post('/auth/logout', {}, { withCredentials: true });

    // Optionally clear local storage or other client-side data
    localStorage.clear();

    // Redirect to login page
    navigate('/login');
  } catch (error) {
    console.error('Error during logout:', error);
  }
};
