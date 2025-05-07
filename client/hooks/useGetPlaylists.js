import React, { useEffect, useState } from "react";
import axios from "axios";
import Constants from "expo-constants";

const api = Constants.expoConfig.extra.clientApi;
// const api = "http://100.97.171.161:5000";

const useGetAllSongs = ({ setPlaylists }) => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            const res = await axios.get(`${api}/playlist/get`);

            setPlaylists(prev => [...prev, ...res.data.playlists]);

            setLoading(false);
        };
        fetch();
    }, []);
    return { loading };
};

export default useGetAllSongs;
