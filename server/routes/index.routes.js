import express from "express";

import musicModel from "../models/musics.js";
import userModel from "../models/users.js";

import findSong from "../handlers/findSong.js";
import addSong from "../handlers/addSong.js";
import formateTitle from "../utils/clearTitle.js";

const router = express.Router();

router.post("/checkSongExistsByYtId", async (req, res) => {
    const { id, title=''} = req.body;

    const exists = await musicModel.findOne({ ytId: id });
    const exists2 = await musicModel.findOne({ title });
    const exists3 = await musicModel.findOne({ title: formateTitle(title)});
       
    if (exists || exists2 || exists3) res.json({ exists: true });
    else res.json({ exists: false });
});

router.post("/findSong", findSong);

router.post("/addSong", addSong);

router.post("/getGlobalSongs", async (req, res) => {
    try {
        const { limit, allPages, userId } = req.body;

        let isAuth = false;

        if (userId) {
            const user = await userModel.findOne({ userId });
            if (user) isAuth = user.isAuthenticated;
        }

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

        const musics = await musicModel
            .find({})
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        return res.status(200).json({
            musics,
            availablePages: availablePages.length--,
            page,
            isAuth
        });
    } catch (error) {
        console.error("error while fetching songs: ", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/searchSong", async (req, res) => {
    const { text } = req.body;
    try {
        const regex = new RegExp(text, "i");
        const songs = await musicModel.find({ title: regex });

        const prioritized = songs.sort((a, b) => {
            const getPriority = title => {
                const lowerTitle = title.toLowerCase();
                const lowerText = text.toLowerCase();

                if (lowerTitle.startsWith(lowerText + " ")) return 1; // Exact first word match
                if (lowerTitle.split(" ")[0].includes(lowerText)) return 2; // Partial first word match
                if (lowerTitle.includes(lowerText)) return 3; // Anywhere match
                return 4; // Should not happen with regex, but safe fallback
            };

            return getPriority(a.title) - getPriority(b.title);
        });

        res.json({ songs: prioritized.slice(0, 10) });
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});



export default router;
