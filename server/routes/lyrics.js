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
    const { lyrics, id } = req.body;

    const music = await musicModel.findOneAndUpdate(
        { _id: id },
        { $set: { lyrics: lyrics } }
    );

    console.log(music);
    res.status(200).json({ title: music.title, success: true });
});

export default router;
