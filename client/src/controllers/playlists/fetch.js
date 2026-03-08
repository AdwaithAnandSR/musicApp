import axios from "@services/axios";

import { storage } from "@services/storage";
import { usePlayer } from "@store/player";

const appendToQueue = usePlayer.getState().appendToQueue;

export const fetchPlaylists = async ({ pageParam = 1 }) => {
    try {
        const res = await axios.post(`/playlist/get`, {
            page: pageParam,
            limit: 20
        });

        if (res.data.playlists && pageParam === 1) {
            storage.set(
                "playlists",
                JSON.stringify(res.data.playlists?.slice(10))
            );
        }

        return res.data ?? { playlists: [], nextPage: null, hasMore: false };
    } catch (err) {
        console.log(err);
        return {
            playlists: [],
            nextPage: null,
            hasMore: false
        };
    }
};

export const getPlaylistSongs = async ({
    pageParam = 1,
    limit,
    playlistId
}) => {
    try {
        const { data } = await axios.post("/playlist/getSongs", {
            playlistId,
            page: pageParam,
            limit
        });

        appendToQueue(playlistId, data?.musics ?? []);

        return data ?? { musics: [], nextPage: null, hasMore: false };
    } catch (err) {
        console.log(err);
        return {
            musics: [],
            nextPage: null,
            hasMore: false
        };
    }
};
