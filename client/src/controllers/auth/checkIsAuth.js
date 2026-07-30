import Constants from "expo-constants";
import axios from "@services/axios";

import { useAppStatus } from "@store/appState.store";

const checkIsAuth = async () => {
    const updateUser = useAppStatus.getState().updateUser;
    const removeUser = useAppStatus.getState().removeUser;
    try {
        const res = await axios.get(`/auth/me`);
        if (res.data?.success && res.data.user) {
            updateUser(res.data.user);
            return true;
        }
    } catch (e) {
        // Only clear session if the server explicitly responded with 401 (Unauthorized)
        if (e?.response?.status === 401) {
            removeUser();
        } else {
            console.log("Network error during auth check, preserving session:", e?.message);
        }
    }
    return false;
};

export default checkIsAuth;
