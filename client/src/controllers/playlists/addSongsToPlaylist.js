import axios from "@services/axios";
import Toast from "@services/Toast.js";

const addSongsToPlaylist = async ({ id, selectedSongs, reset }) => {
    try {
        Toast.show("please wait...", "pending");

        const selectedSongIds = selectedSongs
            ?.map(s => (typeof s === "string" ? s : s?.id || s?._id))
            .filter(Boolean);

        const res = await axios.post(`/playlist/add`, {
            id,
            selectedSongIds
        });

        if (selectedSongs?.length === 1 && reset) reset();

        if (res.status === 200) {
            Toast.show("Songs Added Successfully", "success");
        }
    } catch (error) {
        console.log(error);
        Toast.show("Failed to add songs", "error");
    }
};

export default addSongsToPlaylist;

