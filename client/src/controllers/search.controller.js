import axios from "@services/axios";

const searchSongs = async ({ text, pageParam, limit, signal }) => {
    const res = await axios.post(
        "/searchSong",
        { text, page: pageParam, limit },
        { signal }
    );
    
    return res.data;
};

export default searchSongs;
