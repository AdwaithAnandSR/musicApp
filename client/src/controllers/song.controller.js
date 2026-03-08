import axios from "@services/axios";
import { storage, userId } from "@services/storage.js";

import { usePlayer } from "@store/player";

const appendToQueue = usePlayer.getState().appendToQueue;

export async function fetchSongs({ pageParam = [] }) {
    try {
        const { data } = await axios.post(`/getGlobalSongs`, {
            limit: 10,
            seenPages: pageParam,
            userId
        });

        const result = {
            musics: data?.musics ?? [],
            hasMore: data?.hasMore ?? false,
            nextSeenPages: data?.nextSeenPages ?? [],
            isAuth: data?.isAuth ?? true
        };

        // storage.set(
        //     "HOME",
        //     JSON.stringify({
        //         ...result,
        //         musics: result.musics.slice(0, 10)
        //     })
        // );

        appendToQueue("HOME", result?.musics ?? []);

        return result;
    } catch (err) {
        console.log(err);

        if (err?.response?.data) {
            return {
                musics: err.response.data?.musics ?? [],
                hasMore: false,
                nextSeenPages: [],
                isAuth: err.response.data?.isAuth ?? true
            };
        }

        return {
            musics: [],
            hasMore: false,
            nextSeenPages: [],
            isAuth: true
        };
    }
}
