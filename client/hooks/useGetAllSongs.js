import { useEffect, useState } from "react";
import axios from "axios";
import Constants from "expo-constants";

import { useTrack } from "../context/track.context.js";
import { storage } from "../services/storage.js";

const api = Constants.expoConfig.extra.clientApi;

const useGetAllSongs = ({ page, limit, setAllSongs, setLoading }) => {
    const [hasMore, setHasMore] = useState(true);
    const [total, setTotal] = useState(-1);
    const { setQueueManager, track } = useTrack();

    const fetchSongs = async () => {
        setLoading(true);
        try {
            const res = await axios.post(`${api}/getGlobalSongs`, {
                limit,
                page
            });

            const data = res.data?.musics || [];
            if (data.length < limit) setHasMore(false);
            setTotal(res.data.total)
            setAllSongs(prev => {
                const existingIds = new Set(prev.map(song => song._id));
                const newSongs = data.filter(
                    song => !existingIds.has(song._id)
                );
                const allSongs = [...prev, ...newSongs];
                const newCurrentIndex =
                    allSongs.findIndex(song => song._id === track?._id) || 0;
                setQueueManager({
                    type: "/Home",
                    id: 0,
                    tracks: allSongs,
                    currentIndex: newCurrentIndex || 0
                });
                return allSongs;
            });

            if (page === 1) storage.set("songs", JSON.stringify(data));
        } catch (err) {
            console.error("Error fetching songs:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!page || !limit || !setAllSongs) return;

        fetchSongs();
    }, [page, limit, setAllSongs,]);

    return { hasMore, total };
};

export default useGetAllSongs;
