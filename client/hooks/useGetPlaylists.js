import { useEffect, useState } from "react";
import axios from "axios";
import Constants from "expo-constants";

import { storage } from "../services/storage.js";
import { useGlobalSongs } from "../store/list.store.js";

const api = Constants.expoConfig.extra.clientApi;

const useGetAllSongs = () => {
    const [loading, setLoading] = useState(true);
    const updatePlaylists = useGlobalSongs(state => state.updatePlaylists);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            const res = await axios.get(`${api}/playlist/get`);
            const data = res.data.playlists;
            updatePlaylists(data);

            setLoading(false);
            storage.set("playlists", JSON.stringify(data));
        };
        fetch();
    }, []);
    return { loading };
};

export default useGetAllSongs;
