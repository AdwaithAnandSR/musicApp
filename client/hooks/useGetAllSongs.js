import { useEffect, useState } from "react";
import axios from "axios";
import Constants from "expo-constants";

import { usePlayerStore } from "../store/player.store.js";
import { storage, userId } from "../services/storage.js";
import { useAppStatus } from "../store/appState.store.js";
import { useGlobalSongs } from "../store/list.store.js";
import Toast from "../services/Toast.js";

let api = Constants.expoConfig.extra.clientApi;
const PLAYLIST_NAME = "HOME";

const useGetAllSongs = ({ limit, page }) => {
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);

    const addToPlaylist =usePlayerStore(state => state.addToPlaylist)

    const playlists = usePlayerStore(state => state.playlists);
    const setIsAuthenticated = useAppStatus(state => state.setIsAuthenticated);
    const allPages = useGlobalSongs(state => state.allPages);
    const { updateAllPages, updateAllSongs } = useGlobalSongs();

    // const { insertSongs, clearSongs } = useSqlControlls();

    const fetchSongs = async () => {
        setLoading(true);
        try {
            const res = await axios.post(`${api}/getGlobalSongs`, {
                limit,
                allPages,
                userId
            });

            if (!res.data?.isAuth) {
                storage.set("isAuthenticated", false);
                return setIsAuthenticated(false);
            }

            const data = res.data;
            const { availablePages, musics, page: newPage } = data;

            updateAllPages(newPage);

            if (availablePages === 0) setHasMore(false);
            if (musics.length > 0) {
                const mapped = musics.map(({ _id, cover, ...rest }) => ({
                    id: _id,
                    artwork: cover,
                    ...rest
                }));
                // updateAllSongs(mapped);
                addToPlaylist(PLAYLIST_NAME, mapped);
            }
        } catch (err) {
            if (!err.response) {
                if (err.code === "ECONNABORTED") {
                    Toast.show("Request timed out", "error");
                    console.error("Request timed out - possibly slow network.");
                } else {
                    Toast.show(err.message, "error");
                    console.error(
                        "Network error - possibly offline:",
                        err.message
                    );
                }
            } else {
                Toast.show("Something Went Wrong", "error");
                console.error(
                    "API error:",
                    err.response.status,
                    err.response.data
                );
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!page || !limit) return;
        fetchSongs();
    }, [page, limit]);

    return { loading, hasMore };
};

export default useGetAllSongs;
