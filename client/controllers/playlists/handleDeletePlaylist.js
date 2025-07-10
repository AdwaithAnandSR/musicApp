import axios from "axios";
import Constants from "expo-constants";

import Toast from "../../services/Toast.js";
import { storage } from "../../services/storage.js";

const api = Constants.expoConfig.extra.clientApi;

const handleDeletePlaylist = async ({ id, deletePlaylist }) => {
    try {
        Toast.show("please wait...", "pending");
        const res = await axios.post(`${api}/playlist/delete`, { id });
        if (res.status === 200) {
            deletePlaylist(id);
            Toast.show("Playlist Deleted", "success");
        }
    } catch (error) {
        if (error.response.data.message === "PLAYLIST_NOT_FOUND") {
            deletePlaylist(id);
            Toast.show("Playlist already deleted!", "error");
        } else if (error.response.data.message === "INTERNAL_ERROR")
            Toast.show("INTERNAL_ERROR", "error");
        else Toast.show(`${error.message}`, "error");
        console.log(error);
    }
};

export default handleDeletePlaylist;
