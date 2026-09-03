import { create } from "axios";
import { getToken, removeToken } from "./storage.js";
import { useAppStatus } from "@store/appState.store";

const BASE_URL = process.env.EXPO_PUBLIC_API || "http://localhost:5000";
// const BASE_URL =  "http://localhost:5000";
// const BASE_URL =  "";


const api = create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: { "Content-Type": "application/json" }
});

// Attach JWT
api.interceptors.request.use(
    config => {
        const token = getToken();
        if (token) config.headers.set("Authorization", `Bearer ${token}`);
        return config;
    },
    error => Promise.reject(error)
);

api.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            removeToken();
            useAppStatus.getState().removeUser();
        }
        return Promise.reject(error);
    }
);

export default api;
