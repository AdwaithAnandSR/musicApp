import express from "express";
import musicModel from "../models/musics.js";
import { signin, signup } from "../handlers/auth.handler.js";

const router = express.Router();

router.get("/", async (req, res) => {
    res.send("hey heyyyy");
});

router.post("/getGlobalSongs", async (req, res) => {
    try {
        const { limit, page } = req.body;
        const musics = await musicModel
            .find({})
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        if (musics) return res.status(200).json({ musics });
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
