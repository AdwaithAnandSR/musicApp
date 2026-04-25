import Playlist from "../../models/playlist.js";
import PlaylistSong from "../../models/playlistSong.js";
import mongoose from "mongoose";

const addSongs = async (req, res) => {
    try {
        const { id, selectedSongIds } = req.body;

        if (!id || !selectedSongIds?.length) {
            return res.status(400).json({
                message: "Playlist ID and songs are required"
            });
        }

        const playlistId = new mongoose.Types.ObjectId(id);

        const playlist = await Playlist.findById(playlistId);
        if (!playlist) {
            return res.status(404).json({
                message: "Playlist not found"
            });
        }

        // Remove duplicates + validate
        const songIds = [...new Set(selectedSongIds)]
            .filter(id => mongoose.Types.ObjectId.isValid(id))
            .map(id => new mongoose.Types.ObjectId(id));

        const existing = await PlaylistSong.find({
            playlistId,
            songId: { $in: songIds }
        }).select("songId");

        const existingIds = new Set(existing.map(e => e.songId.toString()));

        const newSongs = songIds.filter(
            songId => !existingIds.has(songId.toString())
        );

        if (!newSongs.length) {
            return res.status(200).json({
                message: "No new songs to add"
            });
        }

        const last = await PlaylistSong
            .findOne({ playlistId })
            .sort({ order: -1 });

        let startOrder = last ? last.order + 1 : 1;

        const docs = newSongs.map((songId, index) => ({
            playlistId,
            songId,
            order: startOrder + index
        }));

        await PlaylistSong.insertMany(docs);

        return res.status(200).json({
            message: "Songs added successfully"
        });
    } catch (error) {
        console.error("Error adding songs:", error);
        return res.status(500).json({
            message: "Something went wrong"
        });
    }
};

export default addSongs;