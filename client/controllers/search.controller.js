import Constants from "expo-constants";
import axios from "axios";

import { usePlayerStore } from "../store/player.store.js";

let api = Constants.expoConfig.extra.clientApi;
let controller = null;
const replacePlaylist = usePlayerStore.getState().replacePlaylist;

const search = async (text) => {
    try {
        text = text.trim()
        if (text === "" || text.length < 5) return replacePlaylist("SEARCH", [])

        if (controller) controller.abort();

        controller = new AbortController();

        const res = await axios.post(
            `${api}/searchSong`,
            {
                text: text.trim()
            },
            {
                signal: controller.signal
            }
        );

        const songs = res.data?.songs?.map(({ _id, cover, ...rest }) => {
            return {
                id: _id,
                artwork: cover,
                ...rest
            };
        });


        if (songs?.length > 0) {
            replacePlaylist("SEARCH", songs);
        } else {
            replacePlaylist("SEARCH", []);
        }
    } catch (err) {
        console.log(err);
    }
};

export default search;
