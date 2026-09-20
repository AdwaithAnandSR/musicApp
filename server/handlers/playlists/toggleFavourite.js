import Music from "../../models/musics.js";
import { processVideoDownload } from "../../utils/videoDownloader.js";

const toggleFavourite = async (req, res) => {
    try {
        const { songId } = req.body;
        
        if (!songId) {
            return res.status(400).json({ message: "songId is required" });
        }

        const music = await Music.findById(songId);
        
        if (!music) {
            return res.status(404).json({ message: "Song not found" });
        }

        music.isFav = !music.isFav;
        music.favAt = music.isFav ? new Date() : null;
        await music.save();

        console.log("toggled fav")

        if (music.isFav && !music.videoUrl && music.ytId) {
            // Trigger background download, do not await it
            processVideoDownload(music._id, music.ytId).catch(err => {
                console.error("Background video download error:", err);
            });
        }

        return res.status(200).json({ 
            message: music.isFav ? "Added to Favourites" : "Removed from Favourites",
            isFav: music.isFav 
        });

    } catch (error) {
        console.error("❌ toggleFavourite error:", error);
        return res.status(500).json({
            message: "Something went wrong"
        });
    }
};

export default toggleFavourite;
