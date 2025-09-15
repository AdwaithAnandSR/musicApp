import { useEffect, useState } from "react";
import axios from "axios";
import Constants from "expo-constants";

import { usePlayerStore } from "../store/player.store.js"

const api = Constants.expoConfig.extra.clientApi;
// const api = "http://localhost:5000";

const useGetPlaylistSongs = ({ page, limit, playlistId }) => {
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [total, setTotal] = useState(-1);
    
    const addToPlaylist = usePlayerStore(state=> state.addToPlaylist)

    useEffect(() => {
        if (!page || !limit || !playlistId) return;

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
                
                console.log(songs)
                
                if(songs?.length > 0){
                    const mapped = songs.map(({ _id, cover, ...rest }) => ({
                        id: _id,
                        artwork: cover,
                        ...rest
                    }));
                    await addToPlaylist(playlistId, mapped)
                    if (songs.length < limit) setHasMore(false);
                }
                
                
                
            } catch (error) {
                console.log(error);
            } finally {
                setLoading(false);
            }
        };
        fetchSongs();
    }, [page, limit, playlistId]);
    return { loading, hasMore, total };
};

export default useGetPlaylistSongs;
