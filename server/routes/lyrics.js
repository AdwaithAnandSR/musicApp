import express from "express";
import musicModel from "../models/musics.js";

const router = express.Router();

router.get("/", async (req, res) => {
    res.send("lyrics");
});

router.post("/get", async (req, res) => {
    const { page, limit } = req.body
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
