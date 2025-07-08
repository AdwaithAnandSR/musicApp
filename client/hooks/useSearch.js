import { useEffect, useState, useRef, useCallback } from "react";
import Constants from "expo-constants";
import axios from "axios";

const api = Constants.expoConfig.extra.clientApi;

const useSearch = ({ text, setList }) => {
    const [songs, setSongs] = useState([]);
    const [loading, setLoading] = useState(false);
    const controllerRef = useRef(null);

    const fetchSongs = async () => {
        try {
            setLoading(true);
            const res = await axios.post(
                `${api}/searchSong`,
                { text }
            );

            if (res?.data?.songs?.length > 0) setSongs(res.data.songs);
            else setSongs([]);
        } catch (err) {
            if (err.name !== "CanceledError") {
                console.error("Search error:", err);
            } else console.log(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (!text || text.trim() === "") {
                setSongs([]);
            } else {
                console.log("fetch");
                fetchSongs();
            }
        }, 500);

        return () => {
            clearTimeout(timeout);
            
        };
    }, [text, fetchSongs]);

    return { songs, loading };
};

export default useSearch;
