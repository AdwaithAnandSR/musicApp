import Constants from "expo-constants";
import axios from "@services/axios";
import {
    getToken,
    removeToken,
    removeUser,
    setIsAuth
} from "@services/storage.js";

const checkIsAuth = async setIsAuthenticated => {
    const token = getToken();

    if (!token) {
        setIsAuthenticated(false);
        return false;
    }

    try {
        const res = await axios.get(`/auth/me`);

        if (res.data?.success) {
            setIsAuthenticated(true);
            setIsAuth(true);
            return true;
        }

        setIsAuthenticated(false);
        setIsAuth(false);

        throw new Error("invalid response");
    } catch {
        removeToken();
        removeUser();
        setIsAuthenticated(false);
        setIsAuth(false);
        return false;
    }
};

export default checkIsAuth;
