import api from "../../services/axios.js";
import { removeToken, removeUser } from "../../services/storage.js";

const logout = async setIsAuthenticated => {
    try {
        await api.post("/users/logout");
    } catch {
        // Clear locally even if server call fails
    } finally {
        removeToken();
        removeUser();
        setIsAuthenticated(false);
    }
};

export default logout;
