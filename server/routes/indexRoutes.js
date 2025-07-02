import express from "express";
import { signin, signup } from "../handlers/auth.handler.js";

import musicModel from "../models/musics.js";
import findSong from "../handlers/findSong.js";
import addSong from "../handlers/addSong.js";

const router = express.Router();

router.post("/checkSongExistsByYtId", async (req, res) => {
    const { id } = req.body;

    const exists = await musicModel.findOne({ ytId: id });

    if (exists) res.json({ exists: true });
    else res.json({ exists: false });
});

router.post("/findSong", findSong);

router.post("/addSong", addSong);

router.post("/getGlobalSongs", async (req, res) => {
    try {
        const { limit, page } = req.body;

        const musics = await musicModel
            .find({})
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await musicModel.countDocuments();

        if (musics) return res.status(200).json({ musics, total });
    } catch (error) {
        console.error("error while fetching songs: ", error);
    }
});

router.post("/searchSong", async (req, res) => {
    const { text } = req.body;
    try {
        const songs = await musicModel.find({
            title: { $regex: text, $options: "i" } // i : case-insensitive
        });

        res.json({ songs });
    } catch (error) {
        console.error("Search error:", error);
    }
});

// authentication routes
router.post("/signin", signin);
router.post("/signup", signup);

export default router;
