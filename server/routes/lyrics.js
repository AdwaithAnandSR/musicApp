import express from "express";
import musicModel from "../models/musics.js";

const router = express.Router();

router.get("/get", async (req, res) => {
    const musics = await musicModel
        .find({
            $or: [
                { lyrics: { $exists: false } },
                { lyrics: null },
                { lyrics: { $size: 0 } }
            ]
        })
        .sort({ createdAt: -1 })
        .limit(5);

    console.log(musics);
    return res.json({ musics });
});

router.get("/add", async (req, res) => {
    const { lyrics } = req.body;

    const music = await musicModel.findOneAndUpdate(
        { url: audio_url },
        { $set: { lyrics: lyrics } }
    );

    console.log(music);
});

export default router;
