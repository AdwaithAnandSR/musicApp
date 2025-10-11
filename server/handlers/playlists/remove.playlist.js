import playlistModel from "../../models/playlist.js";
import musicModel from "../../models/musics.js";

import mongoose from "mongoose";

const removeSong = async (req, res) => {
    const { playlistId, songId } = req.body;

    if (!playlistId || !songId)
        return res
            .status(400)
            .json({ message: "Playlist ID and SongId is required" });

    try {
        const result = await playlistModel.updateOne(
            { _id: playlistId },
            { $pull: { songs: songId } }
        );

        if (result.matchedCount === 0) {
            res.json({ message: "playlist not found" });
        } else if (result.modifiedCount === 0) {
            res.json({ message: "song not found" });
        } else {
            res.json({ message: "Song removed successfully" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

export default removeSong;
