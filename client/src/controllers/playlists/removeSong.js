import axios from "@services/axios";
import Toast from "@services/Toast.js";
import { useAppStatus } from "@store/appState.store.js";
import { usePlayer } from "@store/player.js";
import queryClient from "@services/queryClient";

const removeSong = async dets => {
    try {
        const { songId, playId: playlistId } = dets;

        useAppStatus.getState().setPopUpOption(-1, null, null);

        Toast.show("Removing song from playlist...", "pending");

        const res = await axios.post(`/playlist/remove`, {
            songId,
            playlistId
        });

        if (res.status === 200) {
            Toast.show(
                res?.data?.message || "Song removed successfully",
                "success"
            );

            usePlayer.getState().removeFromQueue(songId);

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

export const removeSongsBatch = async ({ playlistId, songIds }) => {
    try {
        if (!playlistId || !songIds?.length) return;

        useAppStatus.getState().setPopUpOption(-1, null, null);
        Toast.show(`Removing ${songIds.length} song(s)...`, "pending");

        const res = await axios.post(`/playlist/remove`, {
            playlistId,
            songIds
        });

        if (res.status === 200) {
            Toast.show(
                res?.data?.message || "Song(s) removed successfully",
                "success"
            );

            usePlayer.getState().removeFromQueue(songIds);

            const removeSet = new Set(songIds);
            queryClient.setQueryData([playlistId], prev => {
                if (!prev) return prev;

                return {
                    ...prev,
                    pages: prev.pages.map(page => ({
                        ...page,
                        musics: page.musics.filter(
                            song => !removeSet.has(song._id || song.id)
                        )
                    }))
                };
            });
        }
    } catch (error) {
        Toast.show(
            error?.response?.data?.message || "Failed to remove song(s)",
            "error"
        );
        console.log(error);
    }
};

export default removeSong;


