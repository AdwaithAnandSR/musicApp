import playlistModel from "../../models/playlist.js";

const getSongs = async (req, res) => {
    const { playlistId, page = 1, limit = 10 } = req.body;

    if (!playlistId)
        return res.status(400).json({ error: "Playlist ID is required" });

    try {
        const playlist = await playlistModel.findById(playlistId).populate({
            path: "songs",
            options: {
                skip: (page - 1) * limit,
                limit: parseInt(limit)
            }
        });

        res.json(playlist);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
};

export default getSongs;
