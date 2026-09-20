import Music from "../../models/musics.js";
// import { processVideoDownload } from "../../utils/videoDownloader.js";

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

        console.log("toggled fav");

        if (music.isFav && !music.videoUrl && music.ytId) {
            console.log("calling api");
            // Trigger p01--musicapp--87699hjhjdrd.code.run background download
            const res = fetch(
                "https://p01--musicapp--87699hjhjdrd.code.run/admin/video-download",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: req.headers.authorization || ""
                    },
                    body: JSON.stringify({
                        songId: music._id,
                        ytId: music.ytId
                    })
                }
            ).catch(err => {
                console.error("Failed to trigger remote video download:", err);
            });

            console.log(res.json());
        }

        return res.status(200).json({
            message: music.isFav
                ? "Added to Favourites"
                : "Removed from Favourites",
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
