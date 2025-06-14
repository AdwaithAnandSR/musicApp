import express from "express";
import mongoose from "mongoose";

import musicModel from "../models/musics.js";
import lyricsModel from "../models/lyrics.js";

import cleanTxt from "../utils/clearTitle.js";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        
        const lyrics = await musicModel
            .find({
                title: { $regex: "Chandanamani", $options: "i" }
            })
            .limit(5);
        
        res.send(lyrics)
    } catch (e) {
        console.log(e);
    }
});

router.post("/insert", async (req, res) => {
    try {
        const { title, details, lyrics } = req.body;

        if (title.length > 0 && lyrics) {
            const exists = await lyricsModel.findOne({ title });
            if (exists) return res.status(401).json({ message: "failed" });
            await lyricsModel.create({ title, details, lyrics });
            return res.status(200).json({ message: "Success" });
        }

        return res.status(410).json({ message: "Success" });
    } catch (e) {
        console.log(e);
        res.status(400).json({ message: "failed" });
    }
});

router.post("/find", async (req, res) => {
    try {
        const { text } = req.body;

        const lyrics = await lyricsModel
            .find({
                title: { $regex: text, $options: "i" }
            })

        return res.json({ lyrics });
    } catch (e) {
        console.log(e);
        res.status(400).json({ message: "failed" });
    }
});

router.post("/addLyricsToSong", async (req, res) => {
    try {
        const { lyricsId, songId, lyricsIndex } = req.body;
        const lyric = await lyricsModel.findById(lyricsId);
        const song = await musicModel.findById(songId);

        if (!song) {
            throw new Error("Song not found");
        }

        if (song.lyricsAsText1.length === 0) {
            if (lyricsIndex == 1)
                await musicModel.findByIdAndUpdate(songId, {
                    $set: { lyricsAsText1: lyric.lyrics }
                });
            else
                await musicModel.findByIdAndUpdate(songId, {
                    $set: { lyricsAsText1: lyric.lyrics2 }
                });
        } else {
            if (lyricsIndex == 1)
                await musicModel.findByIdAndUpdate(songId, {
                    $push: { lyricsAsText2: lyric.lyrics }
                });
            else
                await musicModel.findByIdAndUpdate(songId, {
                    $push: { lyricsAsText2: lyric.lyrics2 }
                });
        }

        const result = await musicModel.findById(songId);
        console.log(result);

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.json({ success: false });
    }
});

router.post("/getRemainingSongs", async (req, res) => {
    try {
        const { limit, page } = req.body;
        
        const songs = await musicModel
            .find({
                lyricsAsText1: { $eq: null }
            })
            .sort({ createdAt: 1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.json({ songs });
    } catch (e) {
        console.log(e);
        res.status(400).json({ message: "failed" });
    }
});

export default router;
