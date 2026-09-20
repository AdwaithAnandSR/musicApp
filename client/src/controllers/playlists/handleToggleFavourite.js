import axios from "@services/axios";
import Toast from "@services/Toast.js";
import queryClient from "@services/queryClient";
import { usePlayer } from "@store/player";

const handleToggleFavourite = async (songId) => {
    if (!songId) return;

    try {
        const res = await axios.post("/playlist/toggleFavourite", { songId });

        if (res.status === 200) {
            // Toast.show(res.data.message, "success");
            
            const isFav = res.data.isFav;

            // Invalidate favourites playlist if active to refetch sorting/additions
            queryClient.invalidateQueries({ queryKey: ["FAVOURITES_PLAYLIST_ID"] });
            
            // Update the song in all other cached playlists
            queryClient.setQueriesData({ predicate: () => true }, (oldData) => {
                if (!oldData || !oldData.pages) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map(page => {
                        if (!page.musics) return page;
                        let changed = false;
                        const newMusics = page.musics.map(m => {
                            if ((m._id || m.id) === songId && m.isFav !== isFav) {
                                changed = true;
                                return { ...m, isFav };
                            }
                            return m;
                        });
                        return changed ? { ...page, musics: newMusics } : page;
                    })
                };
            });

            // Update queue in player store
            const queue = usePlayer.getState().queue;
            const newQueue = queue.map(m => 
                (m._id || m.id) === songId ? { ...m, isFav } : m
            );
            usePlayer.setState({ queue: newQueue });

            return isFav;
        }
    } catch (error) {
        console.error("Toggle favourite error:", error);
        Toast.show("Failed to update favourite", "error");
    }
    return null;
};

export default handleToggleFavourite;
