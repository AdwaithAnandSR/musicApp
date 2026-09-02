import Music from "../../models/musics.js";
import PlaylistSong from "../../models/playlistSong.js";

import mongoose from "mongoose";

export const getSongs = async (req, res) => {
    try {
        const { playlistId, cursor, limit = 50, random, seed } = req.query;

        const isRandom = random === "true";
        const isSpecialPlaylist = playlistId === "6a3e689cfba948ae55682fe3";

        const parsedLimit = Number(limit);
        const playlistObjectId = new mongoose.Types.ObjectId(playlistId);

        let songs = [];
        let mappings = [];

        // =========================
        // 🎵 SPECIAL PLAYLIST (DIRECT MUSIC ACCESS - NEWEST FIRST)
        // =========================
        if (isSpecialPlaylist) {
            let query = {};

            if (cursor) query.createdAt = { $lt: new Date(Number(cursor)) };

            songs = await Music.find(query)
                .select(
                    "_id title cover artist duration url createdAt ytId synced lyrics lyricsAsText"
                )
                .sort({ createdAt: -1 })
                .limit(parsedLimit);
        }
        // =========================
        // 🔀 RANDOM MODE (SIMPLIFIED)
        // =========================
        else if (isRandom) {
            const randomSeed = Number(seed);
            if (isNaN(randomSeed)) {
                return res.status(400).json({ error: "Invalid seed" });
            }

            let query = { playlistId: playlistObjectId };

            if (cursor) query.stableRandom = { $gt: Number(cursor) };
            else query.stableRandom = { $gte: randomSeed };

            // first fetch
            mappings = await PlaylistSong.find(query)
                .sort({ stableRandom: 1 })
                .limit(parsedLimit);

            // 🔁 AUTO WRAP (no flags needed)
            if (mappings.length < parsedLimit) {
                const wrapQuery = cursor
                    ? { stableRandom: { $lte: Number(cursor) } }
                    : { stableRandom: { $lt: randomSeed } };

                const extra = await PlaylistSong.find({
                    playlistId: playlistObjectId,
                    ...wrapQuery
                })
                    .sort({ stableRandom: 1 })
                    .limit(parsedLimit - mappings.length);

                mappings = [...mappings, ...extra];
            }

            // Fetch songs from Music model
            const songIds = mappings.map(m => m.songId);

            const songsRaw = await Music.find({
                _id: { $in: songIds }
            }).select(
                "_id title cover artist duration url createdAt ytId synced lyrics lyricsAsText"
            );

            // preserve order
            const map = new Map(songsRaw.map(s => [s._id.toString(), s]));
            songs = songIds.map(id => map.get(id.toString())).filter(Boolean);
        }
        // =========================
        // 📜 NORMAL MODE
        // =========================
        else {
            let query = { playlistId: playlistObjectId };
            if (cursor) query.order = { $lt: Number(cursor) };

            mappings = await PlaylistSong.find(query)
                .sort({ order: -1 })
                .limit(parsedLimit);

            // Fetch songs from Music model
            const songIds = mappings.map(m => m.songId);

            const songsRaw = await Music.find({
                _id: { $in: songIds }
            }).select(
                "_id title cover artist duration url createdAt ytId synced lyrics lyricsAsText"
            );

            // preserve order
            const map = new Map(songsRaw.map(s => [s._id.toString(), s]));
            songs = songIds.map(id => map.get(id.toString())).filter(Boolean);
        }

        // =========================
        // 🎯 NEXT CURSOR
        // =========================
        let nextCursor = null;

        if (isSpecialPlaylist)
            if (songs.length === parsedLimit)
                nextCursor = songs[songs.length - 1].createdAt.getTime();
            else if (isRandom)
                if (mappings.length === parsedLimit)
                    nextCursor = mappings[mappings.length - 1].stableRandom;
                else if (mappings.length === parsedLimit)
                    nextCursor = mappings[mappings.length - 1].order;

        res.json({
            musics: songs,
            nextCursor
        });
    } catch (err) {
        console.error("❌ getSongs error:", {
            message: err.message,
            stack: err.stack,
            playlistId: req.query?.playlistId,
            timestamp: new Date().toISOString()
        });
        res.status(500).json({ error: "Internal server error" });
    }
};

export default getSongs;
