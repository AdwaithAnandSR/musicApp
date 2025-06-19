import { useEffect, useState } from "react";
import axios from "axios";
import Constants from "expo-constants";

import { useQueueManager } from "../store/track.store.js";
import { useGlobalSongs } from "../store/list.store.js";

import { storage } from "../services/storage.js";
import Toast from "../services/Toast.js";

const api = Constants.expoConfig.extra.clientApi;

const useGetAllSongs = ({ limit }) => {
    const [loading, setLoading] = useState(true);

    const updateQueue = useQueueManager(state => state.updateQueue);
    const loadQueue = useQueueManager(state => state.loadQueue);
    const queueId = useQueueManager(state => state.id);

    const page = useGlobalSongs(state => state.page);
    const updateHasMore = useGlobalSongs(state => state.updateHasMore);
    const updateAllSongs = useGlobalSongs(state => state.updateAllSongs);
    const allSongs = useGlobalSongs(state => state.allSongs);

    const fetchSongs = async () => {
        setLoading(true);
        try {
            const res = await axios.post(`${api}/getGlobalSongs`, {
                limit,
                page
            });

            const data = res.data?.musics || [];

            // If no songs are returned
            if (data.length === 0) {
                if (page === 1) {
                    updateHasMore(false);
                    return; // Don't proceed further
                }
            }

            // If returned songs are less than the requested limit, mark as no more
            if (data.length < limit) updateHasMore(false);

            updateAllSongs(data);

            if (queueId === "HOME") updateQueue(data);
            else loadQueue([...allSongs, ...data]);

            // Only store the first 10 songs when page is 1 and there are some songs
            if (page === 1 && data.length > 0) {
                const sliced = data.slice(0, 10);
                storage.set("songs", JSON.stringify(sliced));
            }
        } catch (err) {
            if (!err.response) {
                if (err.code === "ECONNABORTED") {
                    Toast.show("Request timed out", "error");
                    console.error("Request timed out - possibly slow network.");
                } else {
                    Toast.show("Network error - possibly offline", "error");
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

    return { loading };
};

export default useGetAllSongs;
