import express from "express";
import musicModel from "../models/musics.js";
import lyricsModel from "../models/lyrics.js";

const router = express.Router();

function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function get() {
    try {
        const possibles = new Set();
        const page = 1,
            limit = 5;

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

        for (const song of songs) {
            const title = song.title;
            const texts = title.split(" ");

            for (const text of texts) {
                for (const text2 of texts) {
                    const newTitle = text + " " + text2;

                    // full title search
                    const lyrics1 = await lyricsModel.find({
                        title: { $regex: escapeRegex(title), $options: "i" }
                    });
                    lyrics1.forEach(lyric => possibles.add(lyric._id));

                    // first text search
                    const lyrics2 = await lyricsModel.find({
                        title: { $regex: escapeRegex(text), $options: "i" }
                    });
                    lyrics2.forEach(lyric => possibles.add(lyric._id));

                    // two parts search
                    const lyrics3 = await lyricsModel.find({
                        title: { $regex: escapeRegex(newTitle), $options: "i" }
                    });
                    lyrics3.forEach(lyric => possibles.add(lyric._id));
                }
            }
        }

        console.log(possibles);
    } catch (e) {
        console.log(e);
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
