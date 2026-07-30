import axios from "@services/axios";
import Toast from "@services/Toast.js";
import { useMultiSelect } from "@store/appState.store.js";

const addSongsToPlaylist = async ({ id, selectedSongs, reset }) => {
    try {
        Toast.show("Please+wait", "pending");

        const selectedSongIds = selectedSongs
            ?.map(s => (typeof s === "string" ? s : s?.id || s?._id))
            .filter(Boolean);

        const res = await axios.post(`/playlist/add`, {
            id,
            selectedSongIds
        });

        if (res.status === 200) {
            useMultiSelect.getState().reset();
            if (typeof reset === "function") reset();
            Toast.show("Songs Added", "success");
        }
    } catch (error) {
        console.log(error);
        Toast.show("Add Failed", "error");
    }
};

export default addSongsToPlaylist;

