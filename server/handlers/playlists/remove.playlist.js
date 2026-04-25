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
        const result = await PlaylistSong.deleteOne({
    playlistId,
    songId
});

        if (result.deletedCount === 0) {
            res.json({ message: "No matching document found" });
        } else {
            res.json({ message: "successfully removed the song." });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

export default removeSong;
