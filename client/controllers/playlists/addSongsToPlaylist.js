import axios from "axios";
import Constants from "expo-constants";

import Toast from "../../services/Toast.js";

const api = Constants.expoConfig.extra.clientApi;

const addSongsToPlaylist = async ({ id, selectedSongs, reset }) => {
    try {
        Toast.show("please wait...", "pending");

        const res = await axios.post(`${api}/playlist/add`, {
            id,
            selectedSongs
        });
        
        if(selectedSongs?.length == 1) reset();

        if (res.status === 200) {
            reset();
            Toast.show("Songs Added Successfully", "success");
        }
    } catch (error) {
        console.log(error);
        alert("error occurred");
    }
};

export default addSongsToPlaylist;
