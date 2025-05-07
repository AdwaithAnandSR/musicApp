import React, { useEffect, useState } from "react";
import axios from "axios";
import Constants from "expo-constants";

import { useTrack } from "../context/track.context.js";

const api = Constants.expoConfig.extra.clientApi;
// const api = "http://100.97.171.161:5000";

const useGetPlaylistSongs = ({ page, limit, setSongs, playlistId }) => {
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [playlistName, setPlaylistName] = useState("");

    useEffect(() => {
        if (!page || !limit || !setSongs) return;

        const fetchSongs = async () => {
            setLoading(true);
            const res = await axios.post(`${api}/playlist/getSongs`, {
                limit,
                page,
                playlistId
            });

            if (res.data.songs.length < limit) setHasMore(false);
            setSongs(prev => [...prev, ...res.data.songs]);
            setPlaylistName(res.data.name);
            setLoading(false);
        };
        fetchSongs();
    }, [page]);
    return { loading, hasMore, playlistName };
};

export default useGetPlaylistSongs;
