import express from "express";
import mongoose from "mongoose";

import musicModel from "../models/musics.js";

const router = express.Router();

router.get('/', (req, res)=>{
    res.send("temporory route")
})

router.post('/deleteSong', (req, res)=>{
   try{
      await musicModel.deleteOne({ _id: req.body.songId })
      res.json({ success: true })
   } catch(e){
      console.error(r)
      res.json({ success: false })
   }
})

router.post("/addSong", async (req, res) => {
    try {
        const { title, artist, url, cover, duration, ytId, lang } = req.body;

        console.log(
            "addimg songs:",
            title,
            artist,
            url,
            cover,
            duration,
            ytId,
            lang
        );

        if (!title || !url) {
            return res.status(400).json({
                success: false,
                message: "title and url are required"
            });
        }

        const song = new musicModel({
            title,
            artist: artist || "Unknown",
            url,
            cover: cover || null,
            duration: duration != null ? Number(duration) : undefined,
            ytId: ytId || null,
            lang: lang || null,
            stableRandom: Math.random()
        });

        await song.save();

        return res.status(201).json({
            success: true,
            message: "Song added successfully",
            song
        });
    } catch (err) {
        console.error("[addSong]", err);

        // Duplicate key or validation error
        if (err.code === 11000 || err.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        return res.status(500).json({
            success: false,
            message: err.message || "Failed to add song"
        });
    }
});

// ── POST /api/music/isExists ──────────────────────────────────
// Checks whether a song already exists by ytId or title.
// Body: { title?, ytId? }  — at least one required.
router.post("/isExists", async (req, res) => {
    try {
        const { title, ytId } = req.body;

        if (!title && !ytId) {
            return res.status(400).json({
                success: false,
                message: "title or ytId is required"
            });
        }

        const orConditions = [];
        if (ytId) orConditions.push({ ytId });
        if (title) orConditions.push({ title });

        const song = await musicModel
            .findOne({ $or: orConditions })
            .select("_id title artist ytId url createdAt")
            .lean();

        return res.json({
            success: true,
            exists: !!song,
            song: song || null
        });
    } catch (err) {
        console.error("[isExists]", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Check failed"
        });
    }
});

// ── POST /api/music/bulkExists ───────────────────────────────
// Body: { items: [{ title?, ytId? }] }

router.post("/bulkExists", async (req, res) => {
    try {
        const { items } = req.body;

        console.log("checking exists: ", items);

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "items array required"
            });
        }

        const orConditions = [];

        for (const item of items) {
            if (item.ytId) orConditions.push({ ytId: item.ytId });
            if (item.title) orConditions.push({ title: item.title });
        }

        const existingSongs = await musicModel
            .find({ $or: orConditions })
            .select("_id title ytId")
            .lean();

        // Map for fast lookup
        const map = new Map();

        for (const song of existingSongs) {
            if (song.ytId) map.set(song.ytId, song);
            if (song.title) map.set(song.title, song);
        }

        const result = items.map(item => {
            const match =
                (item.ytId && map.get(item.ytId)) ||
                (item.title && map.get(item.title));

            return {
                ...item,
                exists: !!match,
                song: match || null
            };
        });

        return res.json({
            success: true,
            results: result
        });
    } catch (err) {
        console.error("[bulkExists]", err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

export default router;
