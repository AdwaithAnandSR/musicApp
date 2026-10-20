import express from "express";
import mongoose from "mongoose";

import musicModel from "../models/musics.js";
import lyricsModel from "../models/lyrics.js";

import cleanTxt from "../utils/clearTitle.js";

const router = express.Router();

router.get("/:songId", async (req, res) => {
    try {
        const { songId } = req.params;
        if (!songId || !mongoose.Types.ObjectId.isValid(songId)) {
            return res.status(400).json({ error: "Invalid song id" });
        }

        const song = await musicModel
            .findById(songId)
            .select("lyrics lyricsAsText synced");

        if (!song) {
            return res.status(404).json({ error: "Song not found" });
        }

        res.json({
            lyrics: song.lyrics || [],
            lyricsAsText: song.lyricsAsText || [],
            synced: song.synced || false
        });
    } catch (e) {
        console.error("Error fetching song lyrics:", e);
        res.status(500).json({ error: "Failed to fetch lyrics" });
    }
});

router.get("/", async (req, res) => {
    try {
        const result = await musicModel.find().limit(20);

        res.send(result);
    } catch (e) {
        console.log(e);
        res.status(400).json({ message: "failed" });
    }
});

export default router;
