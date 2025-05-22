import { useEffect, useState } from "react";
import axios from "axios";
import Constants from "expo-constants";

import { storage } from "../services/storage.js";

const api = Constants.expoConfig.extra.clientApi;
// const api = "http://10.32.129.27:5000";

const useGetAllSongs = ({ setPlaylists }) => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            const res = await axios.get(`${api}/playlist/get`);
            const data = res.data.playlists
            setPlaylists(prev => {
                const map = new Map();
                prev.forEach(item => map.set(item._id, item));
                data.forEach(item => map.set(item._id, item));
                return Array.from(map.values());
            });
            setLoading(false);
            storage.set("playlists", JSON.stringify(data));
        };
        fetch();
    }, [ setPlaylists ]);
    return { loading };
};

export default useGetAllSongs;
