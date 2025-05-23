import { useEffect, useState } from "react";
import axios from "axios";
import Constants from "expo-constants";

import { useQueueManager } from "../store/track.store.js";
import { useGlobalSongs } from "../store/list.store.js";
import { storage } from "../services/storage.js";

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
            if (data.length < limit) updateHasMore(false);

            updateAllSongs(data);

            if (queueId === "HOME") updateQueue(data);
            else loadQueue(allSongs);

            if (page === 1) storage.set("songs", JSON.stringify(data));
        } catch (err) {
            console.error("Error fetching songs:", err);
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
