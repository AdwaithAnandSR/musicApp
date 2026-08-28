import axios from "@services/axios";
import { usePlayer } from "@store/player";

export async function fetchSongs({ pageParam }) {
    try {
        const startAt = pageParam?.startAt ?? 0;
        const cursor = pageParam?.cursor ?? startAt;

        const { data } = await axios.get(`/getGlobalSongs`, {
            params: { startAt, cursor }
        });

        const result = {
            musics: data?.musics ?? [],
            hasMore: data?.hasMore ?? false,
            nextCursor: data?.nextCursor ?? null
        };

        usePlayer.getState().appendToQueue("HOME", result?.musics ?? []);

        return result;
    } catch (err) {
        console.log(err);
        throw err;
    }
}

