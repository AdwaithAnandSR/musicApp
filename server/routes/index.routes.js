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

        // ── Detect "Artist – Title" style queries ──────────────────────────
        // Handles: "drake - gods plan", "Drake – God's Plan", "Drake — God's Plan"
        const splitMatch = text.match(/^(.+?)\s*[-–—]\s*(.+)$/);
        const artistQuery = splitMatch?.[1]?.trim();
        const titleQuery  = splitMatch?.[2]?.trim();

        // ── Build compound clauses ─────────────────────────────────────────
        const shouldClauses = [];

        if (artistQuery && titleQuery) {
            // High-confidence "Artist – Title" query: both sides must phrase-match
            shouldClauses.push(
                {
                    phrase: {
                        query: titleQuery,
                        path: "title",
                        score: { boost: { value: 20 } }
                    }
                },
                {
                    phrase: {
                        query: artistQuery,
                        path: "artist",
                        score: { boost: { value: 20 } }
                    }
                }
            );
        }

        // Always include the full raw query too (catches "Coldplay Yellow" style)
        shouldClauses.push(
            // 1. Exact phrase in title — highest confidence
            {
                phrase: {
                    query: text,
                    path: "title",
                    score: { boost: { value: 15 } }
                }
            },

            // 2. Exact phrase in artist
            {
                phrase: {
                    query: text,
                    path: "artist",
                    score: { boost: { value: 12 } }
                }
            },

            // 3. Word-level fuzzy on title (handles typos like "Bohimian Rapsody")
            {
                text: {
                    query: text,
                    path: "title",
                    fuzzy: { maxEdits: 1, prefixLength: 2 },
                    score: { boost: { value: 10 } }
                }
            },

            // 4. Word-level fuzzy on artist
            {
                text: {
                    query: text,
                    path: "artist",
                    fuzzy: { maxEdits: 1, prefixLength: 2 },
                    score: { boost: { value: 7 } }
                }
            },

            // 5. Autocomplete on title (prefix: handles mid-typing "Bohemia...")
            {
                autocomplete: {
                    query: text,
                    path: "title",
                    fuzzy: { maxEdits: 1 },
                    score: { boost: { value: 6 } }
                }
            },

            // 6. Autocomplete on artist
            {
                autocomplete: {
                    query: text,
                    path: "artist",
                    fuzzy: { maxEdits: 1 },
                    score: { boost: { value: 4 } }
                }
            },

            // 7. Lyrics — lowest, only pulls in if nothing else matches
            {
                text: {
                    query: text,
                    path: "lyricsAsText",
                    score: { boost: { value: 1 } }
                }
            }
        );

        const results = await musicModel.aggregate([
            {
                $search: {
                    index: "text",
                    compound: {
                        should: shouldClauses,
                        // Require at least one clause to match — kills junk results
                        minimumShouldMatch: 1
                    }
                }
            },

            {
                $addFields: {
                    score: { $meta: "searchScore" }
                }
            },

            // ── Score threshold — drop results below ~10% of a strong match ──
            // Tune this number based on your data; start conservative
            {
                $match: { score: { $gte: 1.5 } }
            },

            { $sort: { score: -1 } },
            { $skip: skip },
            { $limit: limit + 1 },

            // Strip heavy fields from the response
            {
                $project: {
                    lyricsAsText: 0,
                    lyrics: 0
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
