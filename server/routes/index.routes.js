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

router.get("/getGlobalSongs", async (req, res) => {
  try {
    const startAt = parseFloat(req.query.startAt);
    const cursor  = parseFloat(req.query.cursor ?? startAt);
    const limit   = parseInt(req.query.limit ?? 10);

    let songs = await musicModel
      .find({ stableRandom: { $gte: cursor } })
      .sort({ stableRandom: 1 })
      .limit(limit)
      .lean();

    // Wrap around if not enough results
    if (songs.length < limit) {
      const more = await musicModel
        .find({ stableRandom: { $gte: startAt, $lt: cursor } })
        .sort({ stableRandom: 1 })
        .limit(limit - songs.length)
        .lean();
      songs = [...songs, ...more];
    }

    const last = songs[songs.length - 1];
    const nextCursor = last?.stableRandom ?? null;
    const hasMore = songs.length === limit && nextCursor !== startAt;

    return res.json({ musics: songs, hasMore, nextCursor });
  } catch (err) {
    console.error(err);
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
            return res.json({ musics: [], nextPage: null, hasMore: false });
        }

        const skip = (page - 1) * limit;

        // ── Detect field queries ──────────────────────────
        const artistMatch = text.match(/^artist:\s*(.+)$/i);
        const titleMatch  = text.match(/^title:\s*(.+)$/i);
        const lyricsMatch = text.match(/^lyrics:\s*(.+)$/i);

        const artistQuery = artistMatch?.[1]?.trim();
        const titleQuery  = titleMatch?.[1]?.trim();
        const lyricsQuery = lyricsMatch?.[1]?.trim();

        // ── Detect "Artist - Title" ───────────────────────
        const splitMatch = text.match(/^(.+?)\s*[-–—]\s*(.+)$/);
        const splitArtist = splitMatch?.[1]?.trim();
        const splitTitle  = splitMatch?.[2]?.trim();

        let searchStage;

        // =================================================
        // 🎤 ARTIST SEARCH
        // =================================================
        if (artistQuery) {
            searchStage = {
                $search: {
                    index: "text",
                    compound: {
                        should: [
                            {
                                phrase: {
                                    query: artistQuery,
                                    path: "artist",
                                    score: { boost: { value: 25 } }
                                }
                            },
                            {
                                text: {
                                    query: artistQuery,
                                    path: "artist",
                                    fuzzy: { maxEdits: 1, prefixLength: 2 },
                                    score: { boost: { value: 10 } }
                                }
                            },
                            {
                                autocomplete: {
                                    query: artistQuery,
                                    path: "artist",
                                    fuzzy: { maxEdits: 1 },
                                    score: { boost: { value: 6 } }
                                }
                            }
                        ],
                        minimumShouldMatch: 1
                    }
                }
            };
        }

        // =================================================
        // 🎵 TITLE SEARCH
        // =================================================
        else if (titleQuery) {
            searchStage = {
                $search: {
                    index: "text",
                    compound: {
                        should: [
                            {
                                phrase: {
                                    query: titleQuery,
                                    path: "title",
                                    score: { boost: { value: 25 } }
                                }
                            },
                            {
                                text: {
                                    query: titleQuery,
                                    path: "title",
                                    fuzzy: { maxEdits: 1, prefixLength: 2 },
                                    score: { boost: { value: 10 } }
                                }
                            },
                            {
                                autocomplete: {
                                    query: titleQuery,
                                    path: "title",
                                    fuzzy: { maxEdits: 1 },
                                    score: { boost: { value: 6 } }
                                }
                            }
                        ],
                        minimumShouldMatch: 1
                    }
                }
            };
        }

        // =================================================
        // 📝 LYRICS SEARCH
        // =================================================
        else if (lyricsQuery) {
            searchStage = {
                $search: {
                    index: "text",
                    compound: {
                        should: [
                            {
                                phrase: {
                                    query: lyricsQuery,
                                    path: "lyricsAsText",
                                    score: { boost: { value: 20 } }
                                }
                            },
                            {
                                phrase: {
                                    query: lyricsQuery,
                                    path: "lyrics.line",
                                    score: { boost: { value: 18 } }
                                }
                            },
                            {
                                text: {
                                    query: lyricsQuery,
                                    path: ["lyricsAsText", "lyrics.line"],
                                    fuzzy: { maxEdits: 1 },
                                    score: { boost: { value: 8 } }
                                }
                            }
                        ],
                        minimumShouldMatch: 1
                    }
                }
            };
        }

        // =================================================
        // 🌍 NORMAL SEARCH
        // =================================================
        else {
            const shouldClauses = [];

            // Artist - Title boost
            if (splitArtist && splitTitle) {
                shouldClauses.push(
                    {
                        phrase: {
                            query: splitTitle,
                            path: "title",
                            score: { boost: { value: 20 } }
                        }
                    },
                    {
                        phrase: {
                            query: splitArtist,
                            path: "artist",
                            score: { boost: { value: 20 } }
                        }
                    }
                );
            }

            shouldClauses.push(
                {
                    phrase: {
                        query: text,
                        path: "title",
                        score: { boost: { value: 15 } }
                    }
                },
                {
                    phrase: {
                        query: text,
                        path: "artist",
                        score: { boost: { value: 12 } }
                    }
                },
                {
                    text: {
                        query: text,
                        path: "title",
                        fuzzy: { maxEdits: 1, prefixLength: 2 },
                        score: { boost: { value: 10 } }
                    }
                },
                {
                    text: {
                        query: text,
                        path: "artist",
                        fuzzy: { maxEdits: 1, prefixLength: 2 },
                        score: { boost: { value: 7 } }
                    }
                },
                {
                    autocomplete: {
                        query: text,
                        path: "title",
                        fuzzy: { maxEdits: 1 },
                        score: { boost: { value: 6 } }
                    }
                },
                {
                    autocomplete: {
                        query: text,
                        path: "artist",
                        fuzzy: { maxEdits: 1 },
                        score: { boost: { value: 4 } }
                    }
                },
                {
                    text: {
                        query: text,
                        path: "lyricsAsText",
                        score: { boost: { value: 2 } }
                    }
                },
                {
                    text: {
                        query: text,
                        path: "lyrics.line",
                        score: { boost: { value: 1 } }
                    }
                }
            );

            searchStage = {
                $search: {
                    index: "text",
                    compound: {
                        should: shouldClauses,
                        minimumShouldMatch: 1
                    }
                }
            };
        }

        // =================================================
        // 🚀 EXECUTE
        // =================================================
        const results = await musicModel.aggregate([
            searchStage,
            {
                $addFields: {
                    score: { $meta: "searchScore" }
                }
            },
            {
                $match: { score: { $gte: 1.5 } }
            },
            { $sort: { score: -1 } },
            { $skip: skip },
            { $limit: limit + 1 },
            {
                $project: {
                    lyrics: 0,
                    lyricsAsText: 0
                }
            }
        ]);

        const hasMore = results.length > limit;
        if (hasMore) results.pop();

        res.json({
            musics: results,
            hasMore,
            nextPage: hasMore ? page + 1 : null
        });

    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
