import Constants from "expo-constants";
import axios from "@services/axios";

/**
 * @param {object} params
 * @param {string}   params.username
 * @param {string}   params.password
 * @param {Function} params.setAuthError
 * @param {Function} params.setLoading
 * @param {Function} params.onSuccess   — called when account is created (show pending screen)
 */
const register = async ({
    username,
    password,
    setAuthError,
    setLoading,
    onSuccess
}) => {
    try {
        setLoading(true);
        setAuthError("");

        const res = await axios.post(`/auth/register`, { username, password });

        if (res.data.success) {
            onSuccess();
            
        }
    } catch (error) {
        const msg =
            error.response?.data?.message ||
            "Registration failed. Please try again.";
        setAuthError(msg);
    } finally {
        setLoading(false);
    }
};

export default register;
