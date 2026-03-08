import playlistModel from "../../models/playlist.js";
import mongoose from "mongoose";

const getSongs = async (req, res) => {
    const { playlistId, page = 1, limit = 10 } = req.body;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    const skip = (pageNumber - 1) * limitNumber;

    if (!playlistId) {
        return res.status(400).json({ error: "Playlist ID is required" });
    }

    try {
        const playlist = await playlistModel.aggregate([
            {
                $match: { _id: new mongoose.Types.ObjectId(playlistId) }
            },
            {
                $project: {
                    totalSongs: { $size: "$songs" },
                    songs: { $slice: ["$songs", skip, limitNumber] }
                }
            },
            {
                $lookup: {
                    from: "musics",
                    localField: "songs",
                    foreignField: "_id",
                    as: "songs"
                }
            }
        ]);

        if (!playlist.length) {
            return res.status(404).json({ error: "Playlist not found" });
        }

        const totalSongs = playlist[0].totalSongs;
        const musics = playlist[0].songs;

        const hasMore = skip + musics.length < totalSongs;
        const nextPage = hasMore ? page + 1 : null;

        res.json({
            musics,
            hasMore,
            nextPage
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
};

export default getSongs;
