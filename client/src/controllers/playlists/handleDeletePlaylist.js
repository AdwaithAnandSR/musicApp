import axios from "@services/axios";

import Toast from "@services/Toast.js";
import queryClient from "@services/queryClient.js";

const handleDeletePlaylist = async ({ id, deletePlaylist }) => {
    try {
        Toast.show("Deleting Playlist", "pending");

        const res = await axios.post(`/playlist/delete`, { id });

        if (res.status === 200) {
            queryClient.setQueryData(["playlists"], prev => {
                if (!prev) return prev;

                return {
                    ...prev,
                    pages: prev.pages.map(page => ({
                        ...page,
                        playlists: page?.playlists?.filter(pl => pl._id !== id)
                    }))
                };
            });
            Toast.show("Playlist Deleted", "success");
        }
    
} catch (error) {
    const msg = error?.response?.data?.message;
    if (msg === "PLAYLIST_NOT_FOUND") {
        deletePlaylist(id);
        Toast.show("Already Deleted", "error");
    } else if (msg === "INTERNAL_ERROR") {
        Toast.show("Internal+Error", "error");
    } else {
        Toast.show(error.message, "error");
    }
}

};

export default handleDeletePlaylist;
