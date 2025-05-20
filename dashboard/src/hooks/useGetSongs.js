import { useState, useEffect } from "react";
import axios from 'axios';

const api = "http://10.32.129.27:5000";

const useGetSongs = page => {
    const [songs, setSongs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchList = async () => {
        try {
            setLoading(true);
            const res = await axios.post(`${api}/dashboard/getSongs`, {
                page
            });
            songs = res?.data?.data;
            alert(songs)
        } catch (e) {
            alert(JSON.stringify(e))
            console.log(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchList();
    }, [page]);

    return { songs, loading };
};

export default useGetSongs;
