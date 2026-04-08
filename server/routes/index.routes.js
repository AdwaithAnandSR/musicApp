import express from "express";

import musicModel from "../models/musics.js";
import userModel from "../models/users.js";

import findSong from "../handlers/findSong.js";
import addSong from "../handlers/addSong.js";
import formateTitle from "../utils/clearTitle.js";

const router = express.Router();

router.post("/checkSongExistsByYtId", async (req, res) => {
    const { id, title = "" } = req.body;

    const exists = await musicModel.findOne({ ytId: id });
    const exists2 = await musicModel.findOne({ title });
    const exists3 = await musicModel.findOne({ title: formateTitle(title) });

    if (exists || exists2 || exists3) res.json({ exists: true });
    else res.json({ exists: false });
});

router.post("/findSong", findSong);

router.post("/addSong", addSong);

router.post("/getGlobalSongs", async (req, res) => {
    try {
        const { limit, seenPages, userId } = req.body;

        const count = await musicModel.countDocuments({});
        const totalPages = Math.ceil(count / limit);

        const availablePages = Array.from(
            { length: totalPages },
            (_, i) => i + 1
        ).filter(p => !seenPages.includes(p));

        if (availablePages.length === 0) {
            return res.status(200).json({
                musics: [],
                hasMore: false,
                nextSeenPages: seenPages // nothing new to add
            });
        }

        const page =
            availablePages[Math.floor(Math.random() * availablePages.length)];

        const musics = await musicModel
            .find({})
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        return res.status(200).json({
            musics,
            hasMore: availablePages.length > 1, // >1 because current page is being consumed
            nextSeenPages: [...seenPages, page] // client echoes this back next call
        });
    } catch (error) {
        console.error("error while fetching songs:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/searchSong", async (req, res) => {
    let { text, page = 1, limit = 25 } = req.body;

    try {
        page = Math.max(1, parseInt(page) || 1);
        limit = Math.min(50, parseInt(limit) || 25);

        text = text?.trim();

        if (!text || text.length < 2) {
            return res.json({
                musics: [],
                nextPage: null,
                hasMore: false
            });
        }

        const skip = (page - 1) * limit;

        const results = await musicModel.aggregate([
            {
                $search: {
                    index: "text",
                    compound: {
                        should: [
                            {
                                phrase: {
                                    query: text,
                                    path: "title",
                                    score: {
                                        boost: { value: 15 }
                                    }
                                }
                            },

                            {
                                autocomplete: {
                                    query: text,
                                    path: "title",
                                    fuzzy: {
                                        maxEdits: 1
                                    },
                                    score: {
                                        boost: { value: 8 }
                                    }
                                }
                            },

                            {
                                autocomplete: {
                                    query: text,
                                    path: "artist",
                                    fuzzy: {
                                        maxEdits: 1
                                    },
                                    score: {
                                        boost: { value: 5 }
                                    }
                                }
                            },

                            {
                                text: {
                                    query: text,
                                    path: "lyricsAsText",
                                    score: {
                                        boost: { value: 1 }
                                    }
                                }
                            }
                        ]
                    }
                }
            },

            {
                $addFields: {
                    score: { $meta: "searchScore" }
                }
            },

            {
                $sort: { score: -1 }
            },

            {
                $skip: skip
            },

            {
                $limit: limit + 1
            }
        ]);

        const hasMore = results.length > limit;

        if (hasMore) results.pop();

        const nextPage = hasMore ? page + 1 : null;

        res.json({
            musics: results,
            hasMore,
            nextPage
        });
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({
            error: "Internal Server Error"
        });
    }
});

export default router;
