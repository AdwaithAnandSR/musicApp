import express from "express";
const router = express.Router();

import playlistModel from "../models/playlist.js";

router.post("/create", async (req, res) => {
    const { name, desc } = req.body;

    const existPlaylist = await playlistModel.findOne({ name });

    if (existPlaylist)
        return res.status(405).json({
            message: "playlist already exists"
        });

    const playlist = await playlistModel.create({
        name,
        description: desc
    });

    if (playlist)
        return res.status(200).json({
            message: "playlist created",
            playlist
        });

    return res.status(500).json({
        message: "something went wrong"
    });
});

router.get("/get", async (req, res) => {
    const playlists = await playlistModel.find();

    if (playlists)
        return res.status(200).json({
            playlists
        });
    else
        return res.status(400).json({
            message: "no playlists exists"
        });

    return res.status(500).json({
        message: "something went wrong"
    });
});

router.post("/add", async (req, res) => {
    const { id, selectedSongs } = req.body;

    console.log(id);

    try {
        const updatedPlaylist = await playlistModel.findOneAndUpdate(
            { _id: id },
            {
                $addToSet: {
                    songs: { $each: selectedSongs.map(song => song._id) }
                }
            }
        );

        if (!updatedPlaylist) {
            return res.status(404).json({ message: "Playlist not found" });
        }

        console.log(updatedPlaylist);

        return res.status(200).json({
            message: "Songs added successfully"
        });
    } catch (error) {
        console.error("Error adding songs:", error);
        return res.status(500).json({
            message: "Something went wrong"
        });
    }
});

router.post("/getSongs", async (req, res) => {
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
});

export default router;
