import { useState, useEffect } from "react";
import axios from "axios";

import useGetSongs from "../hooks/useGetSongs.js"

const SongsList = () => {
    const [page, setPage] = useState(1);
    const { songs, loading } = useGetSongs(page)
    

    return (
        <div>
            {songs.map(item => (
                <h6>{item.title}</h6>
            ))}
        </div>
    );
};

export default SongsList;
