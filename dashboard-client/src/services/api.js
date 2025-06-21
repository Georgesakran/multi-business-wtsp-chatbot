import axios from "axios";

const isProd = process.env.NODE_ENV === "production";

// Automatically pick correct backend
const baseURL = isProd
  ? "https://your-backend-production.up.railway.app/api" // ← change this after deploying backend
  : "http://localhost:5001/api"; // ← your local backend

const instance = axios.create({ baseURL });

// Attach token to every request
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default instance;