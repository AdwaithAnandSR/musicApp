import axios from "@services/axios";
import Toast from "@services/Toast.js";
import { useAppStatus } from "@store/appState.store.js";
import queryClient from "@services/queryClient";

const setPopUpOption = useAppStatus.getState().setPopUpOption;

const removeSong = async dets => {
    try {
        const { songId, playId: playlistId } = dets;

        setPopUpOption(-1, null, null);

        Toast.show("Removing song from playlist...", "pending");

        const res = await axios.post(`playlist/remove`, {
            songId,
            playlistId
        });

        if (res.status === 200) {
            Toast.show(
                res?.data?.message || "Song removed successfully",
                "success"
            );

            queryClient.setQueryData([playlistId], prev => {
                if (!prev) return prev;

                return {
                    ...prev,
                    pages: prev.pages.map(page => ({
                        ...page,
                        musics: page.musics.filter(song => song._id !== songId)
                    }))
                };
            });
        }
    } catch (error) {
        Toast.show(
            error?.response?.data?.message || "Failed to remove song",
            "error"
        );
        console.log(error);
    }
};

export default removeSong;
