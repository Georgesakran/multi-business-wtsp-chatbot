import axios from "axios";

const isProd = process.env.NODE_ENV === "production";

const instance = axios.create({
  baseURL: isProd
    ? "https://multi-business-wtsp-chatbot.up.railway.app/api"
    : "http://localhost:5001/api",
});

// Attach token to every request
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default instance;