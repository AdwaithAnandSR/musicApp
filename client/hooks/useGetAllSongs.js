import { useEffect, useState } from "react";
import axios from "axios";
import Constants from "expo-constants";

import { useTrack } from "../context/track.context.js";
import { storage } from "../services/storage.js";

const api = Constants.expoConfig.extra.clientApi;

const useGetAllSongs = ({ page, limit, setAllSongs }) => {
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const { setList, setCurrentPlaylistName } = useTrack();

    useEffect(() => {
        if (!page || !limit || !setAllSongs) return;
        const fetchSongs = async () => {
            setLoading(true);
            const res = await axios.post(`${api}/getGlobalSongs`, {
                limit,
                page
            });
            if (res.data.musics.length < limit) setHasMore(false);
            const data = res.data.musics;
            setAllSongs(prev => [...prev, ...data]);
            setList(prev => [...prev, ...data]);
            setCurrentPlaylistName("allSongs");
            setLoading(false);
            if (page === 1) storage.set("songs", JSON.stringify(data));
        };
        fetchSongs();
    }, [page, limit, setAllSongs, setCurrentPlaylistName, setList]);
    return { loading, hasMore };
};

export default useGetAllSongs;
