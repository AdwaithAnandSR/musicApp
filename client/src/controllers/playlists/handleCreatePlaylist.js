import axios from "@services/axios";
import queryClient from "@services/queryClient";
import Toast from "@services/Toast.js";
import { router } from "expo-router";

const handleCreatePlaylist = async (name, desc, setIsAddNewPlaylist) => {
    if (!name?.trim()) {
        Toast.show("Please enter a playlist name", "error");
        return;
    }

    try {
        Toast.show("Creating playlist...", "pending");
        const res = await axios.post(`/playlist/create`, {
            name: name.trim(),
            desc
        });

        if (res.status === 200) {
            queryClient.setQueryData(["playlists"], prev => {
                if (!prev) return prev;

                return {
                    ...prev,
                    pages: prev.pages.map((page, i) =>
                        i === 0
                            ? {
                                  ...page,
                                  playlists: [
                                      res.data.playlist,
                                      ...page.playlists
                                  ]
                              }
                            : page
                    )
                };
            });
            Toast.show("Playlist created 🎉", "success");
            if (typeof setIsAddNewPlaylist === "function") {
                setIsAddNewPlaylist(false);
            } else {
                router.back();
            }
        }
    } catch (error) {
        const msg =
            error?.response?.data?.message ||
            error.message ||
            "Failed to create playlist";
        Toast.show(msg, "error");
    }
};

export default handleCreatePlaylist;
