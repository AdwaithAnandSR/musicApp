import axios from "axios";
import Constants from "expo-constants";
import { getToken } from "./storage.js";

const BASE_URL =
    process.env.EXPO_PUBLIC_API || "http://localhost:5000";

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: { "Content-Type": "application/json" }
});

// Automatically attach the stored JWT to every request
api.interceptors.request.use(
    config => {
        const token = getToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    error => Promise.reject(error)
);

export default api;
