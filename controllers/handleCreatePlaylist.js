import axios from "axios";
import Constants from "expo-constants";

const api = Constants.expoConfig.extra.clientApi;
// const api = "http://10.91.178.100:5000";

const handleCreatePlaylist = async (
    name,
    desc,
    setMessage,
    setIsAddNewPlaylist
) => {
    try {
        setMessage("creating...");
        const res = await axios.post(`${api}/playlist/create`, {
            name: name.trim(),
            desc
        });

        if (res.status === 200) {
            setMessage("Playlist created successfully");
            setIsAddNewPlaylist(false);
        }
    } catch (error) {
        if (error?.response?.data?.message)
            setMessage(error.response.data.message);
        else setMessage(error.message);
    }
};

export default handleCreatePlaylist;
