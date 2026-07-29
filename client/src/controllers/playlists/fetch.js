import axios from "@services/axios";

import { storage } from "@services/storage";
import { usePlayer } from "@store/player";

export const fetchPlaylists = async ({ pageParam = 1 }) => {
    try {
        const res = await axios.post(`/playlist/get`, {
            page: pageParam,
            limit: 20
        });

        if (res.data.playlists && pageParam === 1) {
            storage.set("playlists", JSON.stringify(res.data.playlists?.slice(0, 10)));
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
    pageParam = null,
    limit = 50,
    playlistId
}) => {
    try {
        const params = { playlistId, limit };
        if (pageParam) params.cursor = pageParam;

        const { data } = await axios.get("/playlist/getSongs", { params });

        usePlayer.getState().appendToQueue(playlistId, data?.musics ?? []);

        return data ?? { musics: [], nextCursor: null };
    } catch (err) {
        console.log(err);
        return {
            musics: [],
            nextCursor: null
        };
    }
};

