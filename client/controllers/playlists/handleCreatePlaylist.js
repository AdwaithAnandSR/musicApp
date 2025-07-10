import axios from "axios";
import Constants from "expo-constants";

import { useGlobalSongs } from "../../store/list.store.js";

const api = Constants.expoConfig.extra.clientApi;
// const api = "http://10.32.129.27:5000";

const handleCreatePlaylist = async (name, desc, setMessage) => {
    try {
        const addPlaylist = useGlobalSongs.getState().addPlaylist;
        setMessage("creating...");
        const res = await axios.post(`${api}/playlist/create`, {
            name: name.trim(),
            desc
        });

        if (res.status === 200) {
            setMessage("Playlist created successfully");
            addPlaylist(res.data.playlist);
        }
    } catch (error) {
        if (error?.response?.data?.message)
            setMessage(error.response.data.message);
        else setMessage(error.message);
    }
};

export default handleCreatePlaylist;
