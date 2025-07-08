import { useEffect, useState } from "react";
import axios from "axios";
import Constants from "expo-constants";

import { useQueueManager } from "../store/track.store.js";
import { useGlobalSongs } from "../store/list.store.js";
import { useAppStatus } from "../store/appState.store.js";
import Toast from "../services/Toast.js";
import { storage, userId } from "../services/storage.js";
import { useSqlControlls } from "../context/sql.context.js";

let api = Constants.expoConfig.extra.clientApi;

const useGetAllSongs = ({ limit }) => {
    const [loading, setLoading] = useState(true);
    const { insertSongs, clearSongs } = useSqlControlls();

    const page = useGlobalSongs(state => state.page);
    const allPages = useGlobalSongs(state => state.allPages);
    const updateAllPages = useGlobalSongs(state => state.updateAllPages);
    const updateHasMore = useGlobalSongs(state => state.updateHasMore);
    const updateAllSongs = useGlobalSongs(state => state.updateAllSongs);
    const setIsAuthenticated = useAppStatus(state => state.setIsAuthenticated);

    // grab the store snapshot functions directly
    const queueManager = useQueueManager.getState();
    const globalSongsStore = useGlobalSongs.getState();

    const fetchSongs = async () => {
        setLoading(true);
        try {
            const res = await axios.post(`${api}/getGlobalSongs`, {
                limit,
                allPages,
                userId
            });

            if (!res.data?.isAuth){
                storage.set("isAuthenticated", false);
                return setIsAuthenticated(false);
            } 

            const data = res.data?.musics || [];

            if (res.data.availablePages === 0) updateHasMore(false);

            updateAllSongs(data);
            updateAllPages(res.data?.page);

            const currentQueueId = queueManager.id;
            const currentAllSongs = globalSongsStore.allSongs;

            if (currentQueueId === "HOME") {
                queueManager.updateQueue(data);
            } else {
                queueManager.loadQueue([...currentAllSongs, ...data]);
            }

            if (page == 1 && data.length != 0) {
                await clearSongs();
                for (const item of data) {
                    await insertSongs(item);
                }
                storage.set("storedPage", res.data.page);
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

    return { loading };
};

export default useGetAllSongs;
