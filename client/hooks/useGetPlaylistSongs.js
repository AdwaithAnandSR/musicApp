import { useEffect, useState } from "react";
import axios from "axios";
import Constants from "expo-constants";

const api = Constants.expoConfig.extra.clientApi;
// const api = "http://10.32.129.27:5000";

const useGetPlaylistSongs = ({ page, limit, setSongs, playlistId }) => {
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [total, setTotal] = useState(-1);

    useEffect(() => {
        if (!page || !limit || !setSongs || !playlistId) return;

        const fetchSongs = async () => {
            try {
                setLoading(true);
                const res = await axios.post(`${api}/playlist/getSongs`, {
                    limit,
                    page,
                    playlistId
                });

                const songs = res.data.songs;
                setTotal(res.data.totalSongs);
                if (songs.length < limit) setHasMore(false);
                setSongs(prev => {
                    const existingIds = new Set(prev.map(song => song._id));
                    const newSongs = songs.filter(
                        song => !existingIds.has(song._id)
                    );
                    return [...prev, ...newSongs];
                });
            } catch (error) {
                console.log(error);
            } finally {
                setLoading(false);
            }
        };
        fetchSongs();
    }, [page, limit, playlistId, setSongs]);
    return { loading, hasMore, total };
};

export default useGetPlaylistSongs;
