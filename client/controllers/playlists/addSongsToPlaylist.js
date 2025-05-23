import axios from "axios";
import Constants from "expo-constants";

import Toast from "../../services/Toast.js";

const api = Constants.expoConfig.extra.clientApi;
// const api = "http://100.97.171.161:5000";

const addSongsToPlaylist = async ({
    id,
    selectedSongs,
    reset,
    setIsAddNewPlaylist
}) => {
    try {
        Toast.show("please wait...", "pending");

        const res = await axios.post(`${api}/playlist/add`, {
            id,
            selectedSongs
        });

        if (res.status === 200) {
            setIsAddNewPlaylist(false);
            reset();
            Toast.show("Songs Added Successfully", "success");
        }
    } catch (error) {
        console.log(error);
        alert("error occurred");
    }
};

export default addSongsToPlaylist;
