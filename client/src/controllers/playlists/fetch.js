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
        throw err;
    }
};

export const getPlaylistSongs = async ({
    pageParam = null,
    limit = 50,
    playlistId,
    artistName,
    random = false,
    seed = null
}) => {
    try {
        const params = { playlistId, limit };
        if (artistName) params.artistName = artistName;
        if (pageParam) params.cursor = pageParam;
        if (random) {
            params.random = true;
            if (seed !== null && seed !== undefined) {
                params.seed = seed;
            }
        }

        const { data } = await axios.get("/playlist/getSongs", { params });

        const queueId = artistName ? `artist_${artistName}` : playlistId;
        usePlayer.getState().appendToQueue(queueId, data?.musics ?? []);

        return data ?? { musics: [], nextCursor: null };
    } catch (err) {
        console.log(err);
        throw err;
    }
};

export const fetchArtists = async ({ pageParam = 1 }) => {
    try {
        const res = await axios.get(`/playlist/artists`, {
            params: {
                page: pageParam,
                limit: 20
            }
        });
        return res.data ?? { playlists: [], nextPage: null };
    } catch (err) {
        console.log(err);
        throw err;
    }
};

