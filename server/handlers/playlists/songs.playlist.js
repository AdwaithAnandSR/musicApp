import playlistModel from "../../models/playlist.js";
import mongoose from 'mongoose';

const getSongs = async (req, res) => {
    const { playlistId, page = 1, limit = 10 } = req.body;

    if (!playlistId)
        return res.status(400).json({ error: "Playlist ID is required" });

    try {
        const playlist = await playlistModel.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(playlistId) } },
            {
                $project: {
                    name: 1,
                    description: 1,
                    createdAt: 1,
                    totalSongs: { $size: "$songs" },
                    songs: {
                        $slice: ["$songs", (page - 1) * limit, parseInt(limit)]
                    }
                }
            },
            {
                $lookup: {
                    from: "musics", // this should be the name of the MongoDB collection (lowercase + plural by default)
                    localField: "songs",
                    foreignField: "_id",
                    as: "songs"
                }
            }
        ]);
        
        console.log(playlist);
        
        res.json(playlist[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
};

export default getSongs;
