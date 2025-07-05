import express from "express";
import { signin, signup } from "../handlers/auth.handler.js";

import musicModel from "../models/musics.js";
import findSong from "../handlers/findSong.js";
import addSong from "../handlers/addSong.js";

const router = express.Router();

await musicModel.updateMany({}, { $set: { synced: false } });

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
        const { limit, allPages } = req.body;

        const count = await musicModel.countDocuments({});
        const totalPages = Math.ceil(count / limit);
        console.log("Total documents:", count, " pages: ", totalPages);

        const possiblePages = Array.from(
            { length: totalPages },
            (_, i) => i + 1
        );
        const availablePages = possiblePages.filter(p => !allPages.includes(p));

        if (availablePages.length === 0)
            return res.status(400).json({ error: "No available pages left." });

        const page =
            availablePages[Math.floor(Math.random() * availablePages.length)];
        console.log(
            "availablePages: ",
            availablePages,
            " Random unused page:",
            page
        );

        const musics = await musicModel
            .find({})
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        return res
            .status(200)
            .json({ musics, availablePages: availablePages.length--, page });
    } catch (error) {
        console.error("error while fetching songs: ", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/searchSong", async (req, res) => {
    const { text } = req.body;
    try {
        if (text.includes("sync:")) {
            const match = text.match(/sync:(\d+)/);
            if (match) {
                const number = parseInt(match[1], 10);
                console.log("Found number:", number);
                const limit = 10;
                const songs = await musicModel
                    .find({
                        lyrics: { $exists: true, $not: { $size: 0 } }
                    })
                    .sort({ createdAt: -1 })
                    .skip((number - 1) * limit)
                    .limit(limit);

                return res.json({ songs });
            }
        }

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
