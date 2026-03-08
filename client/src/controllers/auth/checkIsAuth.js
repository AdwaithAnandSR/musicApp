import Constants from "expo-constants";
import axios from "axios";

import { storage } from "../../services/storage.js"

let api = Constants.expoConfig.extra.clientApi;
// api = "http://localhost:5000";

const fetchUser = async (id, setIsAuthenticated) => {
    try {
        const res = await axios.post(`${api}/users/auth`, { userId: id });

        if (res.data?.success){
            const isAuth = res.data?.user?.isAuthenticated
            console.log(isAuth);
            storage.set("isAuthenticated", isAuth);
            setIsAuthenticated(isAuth)
        }

        // console.log(res.data);
    } catch (error) {
        console.error(error);
    }
};

export default fetchUser