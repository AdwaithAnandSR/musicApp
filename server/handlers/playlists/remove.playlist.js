import PlaylistSong from "../../models/playlistSong.js";
import musicModel from "../../models/musics.js";

import mongoose from "mongoose";

const SPECIAL_PLAYLIST_ID = "6a3e689cfba948ae55682fe3";

const removeSong = async (req, res) => {
    const { playlistId, songId } = req.body;

    if (!playlistId || !songId)
        return res
            .status(400)
            .json({ message: "Playlist ID and SongId is required" });

    try {
        // If it's the special playlist, directly delete from musics collection
        if (String(playlistId) === SPECIAL_PLAYLIST_ID) {
            try {
                const musicDeleteResult = await musicModel.deleteOne({ _id: songId });

                if (musicDeleteResult.deletedCount === 0) {
                    return res.json({ message: "Song not found in musics collection" });
                }

                return res.json({ message: "successfully deleted the song from musics." });
            } catch (err) {
                console.error("Failed to delete song from musics:", err);
                return res.status(500).json({ message: "Failed to delete song from musics" });
            }
        }

        // For regular playlists, remove the PlaylistSong entry
        const result = await PlaylistSong.deleteOne({
            playlistId,
            songId
        });

        if (result.deletedCount === 0) {
            res.json({ message: "No matching document found" });
        } else {
            res.json({ message: "successfully removed the song from playlist." });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

export default removeSong;
