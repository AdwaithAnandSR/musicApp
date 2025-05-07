import axios from "axios";
import Constants from "expo-constants";

const api = Constants.expoConfig.extra.clientApi;
// const api = "http://100.97.171.161:5000";

const addSongsToPlaylist = async ({
    id,
    selectedSongs,
    setSelectedSongs,
    setIsAddNewPlaylist
}) => {
    try {
        const res = await axios.post(`${api}/playlist/add`, {
            id,
            selectedSongs
        });

        if (res.status == 200) {
            setIsAddNewPlaylist(false);
            setSelectedSongs([]);
        }
    } catch (error) {
        console.log(error);
        alert("error occurred");
    }
};

export default addSongsToPlaylist;
