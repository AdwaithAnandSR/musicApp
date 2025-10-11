import axios from "axios";
import Constants from "expo-constants";

import Toast from "../../services/Toast.js";
import { useAppStatus } from "../../store/appState.store.js";
import { usePlayerStore } from "../../store/player.store.js";

const api = Constants.expoConfig.extra.clientApi;
const setPopUpOption = useAppStatus.getState().setPopUpOption;
const removeFromPlaylist = usePlayerStore.getState().removeFromPlaylist;

const removeSong = async dets => {
    try {
        const { songId, playId: playlistId } = dets;
        
        console.log(songId, playlistId)
        
        setPopUpOption(-1, null, null);

        Toast.show("removing song...", "pending");

        const res = await axios.post(`${api}/playlist/remove`, {
            songId,
            playlistId
        });

        if (res.status === 200) {
            Toast.show(res?.data?.message, "success");
            removeFromPlaylist(songId, playlistId)
        }
    } catch (error) {
        Toast.show(
            error?.response?.data?.message || "song remove unsuccessful",
            "error"
        );
        console.log(error);
    }
};

export default removeSong;
