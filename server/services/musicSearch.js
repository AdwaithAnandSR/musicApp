import { Router } from "express";
import mongoose from "mongoose";
import Music from "../models/musics.js";
import { embedText } from "../services/songAiProcessor.js";

const router = Router();

// Name of the Atlas Vector Search index — must match what you create in Atlas (see below).
const VECTOR_INDEX_NAME =
    process.env.AI_VECTOR_INDEX_NAME || "music_vector_search";

const PROJECTION = {
    title: 1,
    artist: 1,
    cover: 1,
    duration: 1,
    ytId: 1,
    "ai.language": 1,
    "ai.moods": 1,
    "ai.themes": 1,
    "ai.genres": 1,
    "ai.situations": 1,
    "ai.energy": 1,
    "ai.description": 1,
    score: { $meta: "vectorSearchScore" }
};

/**
 * GET /search?q=feel good malayalam&limit=20
 *
 * Embeds the query with Gemini (RETRIEVAL_QUERY task type, same model/
 * dimensions used at indexing time) and runs an Atlas $vectorSearch against
 * ai.embedding. Falls back gracefully if q is missing.
 */
router.get("/search", async (req, res) => {
    const q = (req.query.q || "").toString().trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

    if (!q) {
        return res
            .status(400)
            .json({ error: "Missing required query param: q" });
    }

    try {
        const queryEmbedding = await embedText(q, "RETRIEVAL_QUERY");

        const results = await Music.aggregate([
            {
                $vectorSearch: {
                    index: VECTOR_INDEX_NAME,
                    path: "ai.embedding",
                    queryVector: queryEmbedding,
                    numCandidates: Math.max(limit * 20, 150),
                    limit
                }
            },
            { $match: { "ai.processed": true } },
            { $project: PROJECTION }
        ]);

        res.json({ query: q, count: results.length, results });
    } catch (err) {
        console.error("Vector search failed:", err.message);
        res.status(500).json({ error: "Search failed" });
    }
});

/**
 * GET /recommend/:songId?limit=10
 *
 * Uses the target song's own embedding to find semantically similar songs,
 * excluding itself.
 */
router.get("/recommend/:songId", async (req, res) => {
    const { songId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

    if (!mongoose.isValidObjectId(songId)) {
        return res.status(400).json({ error: "Invalid songId" });
    }

    try {
        // "+ai.embedding" is required because the schema marks it select:false
        // by default (see models/musics.js) to keep ordinary song reads light.
        const source = await Music.findById(songId).select(
            "+ai.embedding ai.processed title"
        );
        if (!source) {
            return res.status(404).json({ error: "Song not found" });
        }
        if (
            !source.ai?.processed ||
            !Array.isArray(source.ai.embedding) ||
            source.ai.embedding.length === 0
        ) {
            return res
                .status(409)
                .json({ error: "Song has not been AI-processed yet" });
        }

        const results = await Music.aggregate([
            {
                $vectorSearch: {
                    index: VECTOR_INDEX_NAME,
                    path: "ai.embedding",
                    queryVector: source.ai.embedding,
                    numCandidates: Math.max(limit * 20, 200),
                    limit: limit + 1 // +1 because the source song itself will usually be the top match
                }
            },
            { $match: { _id: { $ne: source._id }, "ai.processed": true } },
            { $limit: limit },
            { $project: PROJECTION }
        ]);

        res.json({
            songId,
            title: source.title,
            count: results.length,
            results
        });
    } catch (err) {
        console.error("Recommendation query failed:", err.message);
        res.status(500).json({ error: "Recommendation failed" });
    }
});

export default router;
