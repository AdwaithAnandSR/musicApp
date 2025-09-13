import Constants from "expo-constants";
import axios from "axios";

import { usePlayerStore } from "../store/player.store.js";

let api = Constants.expoConfig.extra.clientApi;

const search = async text => {
    try {
        if (text.trim() === "") return;
        
        const res = await axios.post(`${api}/searchSong`, {
            text: text.trim()
        });

        const songs = res.data?.songs?.map(({ _id, cover, ...rest }) => {
            return {
                id: _id,
                artwork: cover,
                ...rest
            };
        });
        
        const replacePlaylist = usePlayerStore.getState().replacePlaylist;

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
