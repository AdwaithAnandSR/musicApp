import express from "express";
import mongoose from "mongoose";

import musicModel from "../models/musics.js";
import lyricsModel from "../models/lyrics.js";

import cleanTxt from "../utils/clearTitle.js";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const result = await musicModel.find().limit(20);

        res.send(result);
    } catch (e) {
        console.log(e);
        res.status(400).json({ message: "failed" });
    }
});

router.post("/getUnSyncedLyrics", async (req, res) => {
    try {
        const { limit, page } = req.body;

        const songs = await musicModel
            .find({
                synced: false
            })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.json({ songs });
    } catch (e) {
        console.log(e);
        res.status(400).json({ message: "failed" });
    }
});

router.post("/setSyncedSong", async (req, res) => {
    try {
        const { id, syncedLyric, duration } = req.body;

        const song = await musicModel.findByIdAndUpdate(id, {
            $set: { lyrics: syncedLyric, duration, synced: true }
        });

        console.log(song);
        res.json({ success: true });
    } catch (e) {
        console.log(e);
        res.status(400).json({ success: false });
    }
});

router.post("/getSongById", async (req, res) => {
    try {
        const { id } = req.body;

        let result= await musicModel.findById(id);

        let song = {
            ...result, lyricsAsText1: result.lyrics
        };

        console.log(song);

        res.json({ song });
    } catch (e) {
        console.log(e);
        res.status(400).json({ message: "failed" });
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

        const lyrics = await lyricsModel.find({
            title: { $regex: text, $options: "i" }
        });

        return res.json({ lyrics });
    } catch (e) {
        console.log(e);
        res.status(400).json({ message: "failed" });
    }
});

// add lyrics from lyrics db
router.post("/addLyricsToSong", async (req, res) => {
    try {
        const { lyricsId, songId, lyricsIndex } = req.body;
        const lyric = await lyricsModel.findById(lyricsId);
        const song = await musicModel.findById(songId);

        if (!song) {
            throw new Error("Song not found");
        }

        if (song.lyrics.length === 0) {
            if (lyricsIndex == 1) {
                let lyrics = [];

                lyric.lyrics.map(line => {
                    lyrics.push({ start: -1, line, end: -1 });
                });

                await musicModel.findByIdAndUpdate(songId, {
                    $set: { lyrics }
                });
            } else {
                let lyrics = [];

                lyric.lyrics2.map(line => {
                    lyrics.push({ start: -1, line, end: -1 });
                });

                await musicModel.findByIdAndUpdate(songId, {
                    $set: { lyrics: lyrics }
                });
            }
        } else {
            if (lyricsIndex == 1)
                await musicModel.findByIdAndUpdate(songId, {
                    $push: { lyricsAsText: lyric.lyrics }
                });
            else
                await musicModel.findByIdAndUpdate(songId, {
                    $push: { lyricsAsText: lyric.lyrics2 }
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

// add lyrics that passed as array
router.post("/addLyricsDirectToSong", async (req, res) => {
    try {
        const { lyric, songId, artist = "Unknown" } = req.body;

        const song = await musicModel.findById(songId);

        if (!song) {
            throw new Error("Song not found");
        }

        if (song.lyrics.length === 0) {
            let lyrics = [];

            lyric.map(line => {
                lyrics.push({ start: -1, line, end: -1 });
            });

            await musicModel.findByIdAndUpdate(songId, {
                $set: { lyrics, artist }
            });
        } else {
            await musicModel.findByIdAndUpdate(songId, {
                $set: { lyricsAsText: lyric, artist }
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
                $or: [
                    { lyrics: { $exists: false } },
                    { lyrics: null },
                    { lyrics: { $eq: [] } }
                ]
            })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(20);

        res.json({ songs });
    } catch (e) {
        console.log(e);
        res.status(400).json({ message: "failed" });
    }
});

export default router;
