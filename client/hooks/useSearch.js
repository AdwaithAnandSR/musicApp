/* global AbortController, setTimeout, clearTimeout */
import { useEffect, useState, useRef, useCallback } from "react";
import Constants from "expo-constants";
import axios from "axios";

const api = Constants.expoConfig.extra.clientApi;

const useSearch = ({ text, setList }) => {
    const [songs, setSongs] = useState([]);
    const controllerRef = useRef(null);

    const fetchSongs = useCallback(
        async controller => {
            try {
                const res = await axios.post(
                    `${api}/searchSong`,
                    { text },
                    { signal: controller.signal }
                );

                if (res?.data?.songs?.length > 0) setSongs(res.data.songs);
                else setSongs([]);
            } catch (err) {
                if (err.name !== "CanceledError") {
                    console.error("Search error:", err);
                } else console.log(err);
            }
        },
        [text]
    );

    useEffect(() => {
        if (controllerRef.current) controllerRef.current.abort();

        const controller = new AbortController();
        controllerRef.current = controller;

        const timeout = setTimeout(() => {
            if (!text || text.trim() === "") {
                setSongs([]);
            } else {
                fetchSongs(controller);
            }
        }, 500);

        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [text, fetchSongs]);

    return { songs };
};

export default useSearch;
