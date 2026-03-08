import axios from "@services/axios";
import queryClient from "@services/queryClient";

const handleCreatePlaylist = async (name, desc, setMessage) => {
    try {
        setMessage("Creating playlist, please wait..");
        const res = await axios.post(`/playlist/create`, {
            name: name.trim(),
            desc
        });

        if (res.status === 200) {
            setMessage("Playlist created successfully");
            queryClient.setQueryData(["playlists"], prev => {
                if (!prev) return prev;

                return {
                    ...prev,
                    pages: [...prev.pages, res.data.playlist]
                };
            });
            setMessage("Playlist created 🎉");
        }
    } catch (error) {
        if (error?.response?.data?.message)
            setMessage(error.response.data.message);
        else setMessage(error.message);
    }
};

export default handleCreatePlaylist;
