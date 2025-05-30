import express from "express";
import mongoose from "mongoose";

import musicModel from "../models/musics.js";
import lyricsModel from "../models/lyrics.js";
import cleanText from "../utils/clearTitle.js";

const router = express.Router();

function renderProgressBar(current, total, width = 30) {
    const percentage = current / total;
    const filled = Math.round(percentage * width);
    const empty = width - filled;

    const bar = "█".repeat(filled) + " ".repeat(empty);
    const percent = Math.round(percentage * 100);

    // Move cursor to beginning of line using \r and overwrite
    process.stdout.write(`\r[${bar}] ${percent}%`);

    // If complete, add newline
    if (current >= total) {
        process.stdout.write("\n");
    }
}

async function get() {
    try {
        const limit = 50,
            page = 16,
            possibles = new Set();
        let count = 0;
        const songs = await musicModel
            .find({
                $or: [
                    { lyrics: { $exists: false } },
                    { lyrics: null },
                    { lyrics: { $size: 0 } }
                ]
            })
            .skip((page - 1) * limit)
            .limit(limit);
            
            
        console.log(songs)
        
        return
        
        console.log("starting....");
        
        if(songs.length < limit) console.warn("may run out")

        // const songs = await musicModel.find({});

        for (const song of songs) {
            renderProgressBar(++count, songs.length);
            const title = cleanText(song.title);
            let texts = title.split(" ");
            texts = texts.filter(text => text != "");
            // console.log(texts);
            const text1 = texts[0];
            const lyrics1 = await lyricsModel.find({
                title: { $regex: text1, $options: "i" }
            });
            if (lyrics1.length < 5)
                lyrics1.forEach(lyric => possibles.add(lyric._id));
            for (const text of texts) {
                const newTitle = text1 + " " + text;

                const lyrics3 = await lyricsModel.find({
                    title: { $regex: newTitle, $options: "i" }
                });
                if (lyrics3.length < 10) {
                    lyrics3.forEach(lyric => possibles.add(lyric._id));
                    break;
                }

                const lyrics2 = await lyricsModel.find({
                    title: { $regex: text, $options: "i" }
                });
                if (lyrics2.length < 5)
                    lyrics2.forEach(lyric => possibles.add(lyric._id));
            }
            const uniquePossibles = [
                ...new Set([...possibles].map(id => id.toString()))
            ].map(id => id);

            await musicModel.findByIdAndUpdate(song._id, {
                $set: { possibleLyrics: uniquePossibles }
            });
        }
    } catch (e) {
        console.log(e);
    }finally{
        console.log("finished")
    }
}

get();


router.get("/", async (req, res) => {
    res.send("lyrics");
});

router.get("/getAllSongs", async (req, res) => {
    try {
        const musics = await musicModel.find({});

        return res.json({ musics });
    } catch (e) {
        console.log(e);
        return res.status(400).json({ success: false });
    }
});
router.get("/getAllLyrics", async (req, res) => {
    try {
        const lyrics = await lyricsModel.find({});

        return res.json({ lyrics });
    } catch (e) {
        console.log(e);
        return res.status(400).json({ success: false });
    }
});

router.post("/getAllLyrics", async (req, res) => {
    try {
        const { page, limit } = req.body;
        const lyrics = await lyricsModel
            .find({})
            .skip((page - 1) * limit)
            .limit(limit);

        return res.json({ lyrics });
    } catch (e) {
        console.log(e);
        return res.status(400).json({ success: false });
    }
});

router.post("/get", async (req, res) => {
    const { page, limit } = req.body;
    try {
        const musics = await musicModel
            .find({
                $or: [
                    { lyrics: { $exists: false } },
                    { lyrics: null },
                    { lyrics: { $size: 0 } }
                ]
            })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        return res.json({ musics });
    } catch (e) {
        console.log(e);
        return res.status(400).json({ success: false });
    }
});

router.post("/add", async (req, res) => {
    const { lyrics, id } = req.body;

    const music = await musicModel.findOneAndUpdate(
        { _id: id },
        { $set: { lyrics: lyrics } }
    );

    console.log(music);
    res.status(200).json({ title: music.title, success: true });
});

export default router;
