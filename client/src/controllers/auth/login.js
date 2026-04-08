import Constants from "expo-constants";
import axios from "@services/axios";
import { setToken, setUser } from "@services/storage.js";

/**
 * @param {object} params
 * @param {string}   params.username
 * @param {string}   params.password
 * @param {Function} params.setIsAuthenticated
 * @param {Function} params.setAuthError
 * @param {Function} params.setLoading
 */
const login = async ({
    username,
    password,
    setIsAuthenticated,
    setAuthError,
    setLoading
}) => {
    try {
        setLoading(true);
        setAuthError("");

        const res = await axios.post(`auth/login`, {
            username,
            password
        });
        
        if (res.data.success) {
            setToken(res.data.token);
            setUser(res.data.user);
            setIsAuthenticated(true);
        }
    } catch (error) {
        
        const msg =
            error.response?.data?.message || "Login failed. Please try again.";
        setAuthError(msg);
    } finally {
        setLoading(false);
    }
};

export default login;
