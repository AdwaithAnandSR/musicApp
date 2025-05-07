import React, { useEffect, useState } from "react";
import axios from "axios";
import Constants from "expo-constants";

import { useTrack } from "../context/track.context.js";

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
            setAllSongs(prev => [...prev, ...res.data.musics]);
            setList(prev => [...prev, ...res.data.musics]);
            setCurrentPlaylistName("allSongs");
            setLoading(false);
        };
        fetchSongs();
    }, [page]);
    return { loading, hasMore };
};

export default useGetAllSongs;
