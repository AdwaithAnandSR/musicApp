import Constants from "expo-constants";
import axios from "@services/axios";

import { useAppStatus } from "@store/appState.store";

const checkIsAuth = async () => {
    const updateUser = useAppStatus.getState().updateUser;
    const removeUser = useAppStatus.getState().removeUser;
    try {
        const res = await axios.get(`/auth/me`);
        if (res.data?.success && res.data.user)
            return updateUser(res.data.user);

        removeUser();
        throw new Error("invalid response");
    } catch(e) {
        removeUser();
    }
};

export default checkIsAuth;
