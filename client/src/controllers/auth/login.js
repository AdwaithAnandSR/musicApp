import axios from "@services/axios";
import { setToken } from "@services/storage.js";
import { useAppStatus } from "@store/appState.store";

/**
 * @param {object} params
 * @param {string}   params.username
 * @param {string}   params.password
 * @param {Function} params.setAuthError
 * @param {Function} params.setLoading
 */
const login = async ({ username, password, setAuthError, setLoading }) => {
    try {
        setLoading(true);
        setAuthError("");

        const res = await axios.post(`/auth/login`, {
            username,
            password
        });

        if (res.data.success) {
            setToken(res.data.token);
            useAppStatus.getState().updateUser(res.data.user);
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

