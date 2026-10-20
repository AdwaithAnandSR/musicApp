import Music from "../../models/musics.js";
import PlaylistSong from "../../models/playlistSong.js";

import mongoose from "mongoose";

const MUSIC_SELECT_FIELDS = "_id title cover artist colors duration url videoUrl createdAt ytId synced lyrics lyricsAsText isFav";

export const getSongs = async (req, res) => {
    try {
        const { playlistId, cursor, limit = 50, random, seed, artistName } = req.query;

        const isRandom = random === "true";
        const isSpecialPlaylist = playlistId === "6a3e689cfba948ae55682fe3";
        const isFavPlaylist = playlistId === "FAVOURITES_PLAYLIST_ID";
        const isArtistPlaylist = Boolean(artistName);

        const parsedLimit = Number(limit);
        const playlistObjectId = (playlistId && playlistId !== "ARTISTS_PLAYLIST_ID" && playlistId !== "FAVOURITES_PLAYLIST_ID" && !isArtistPlaylist) ? new mongoose.Types.ObjectId(playlistId) : null;

        let songs = [];
        let mappings = [];

        // =========================
        // 🎵 ARTIST PLAYLIST
        // =========================
        if (isArtistPlaylist) {
            // Escape special regex chars from artist name
            const escapedName = artistName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            
            // Match exact artist name from comma-separated list, ignoring case
            const regex = new RegExp(`(^|,)\\s*${escapedName}\\s*(,|$)`, "i");
            const baseQuery = { artist: { $regex: regex } };

            if (isRandom) {
                const randomSeed = Number(seed);
                if (isNaN(randomSeed)) {
                    return res.status(400).json({ error: "Invalid seed" });
                }

                let query = { ...baseQuery };
                if (cursor) query.stableRandom = { $gt: Number(cursor) };
                else query.stableRandom = { $gte: randomSeed };

                songs = await Music.find(query)
                    .select(`${MUSIC_SELECT_FIELDS} stableRandom`)
                    .sort({ stableRandom: 1 })
                    .limit(parsedLimit);

                // 🔁 AUTO WRAP (no flags needed)
                if (songs.length < parsedLimit) {
                    const wrapQuery = cursor
                        ? { stableRandom: { $lte: Number(cursor) } }
                        : { stableRandom: { $lt: randomSeed } };

                    const extra = await Music.find({
                        ...baseQuery,
                        ...wrapQuery
                    })
                        .select(`${MUSIC_SELECT_FIELDS} stableRandom`)
                        .sort({ stableRandom: 1 })
                        .limit(parsedLimit - songs.length);

                    songs = [...songs, ...extra];
                }
            } else {
                let query = { ...baseQuery };
                if (cursor) query.createdAt = { $lt: new Date(Number(cursor)) };

                songs = await Music.find(query)
                    .select(MUSIC_SELECT_FIELDS)
                    .sort({ createdAt: -1 })
                    .limit(parsedLimit);
            }
        }
        // =========================
        // 🎵 SPECIAL PLAYLIST (DIRECT MUSIC ACCESS - NEWEST FIRST)
        // =========================
        else if (isSpecialPlaylist) {
            let query = {};

            if (cursor) query.createdAt = { $lt: new Date(Number(cursor)) };

            songs = await Music.find(query)
                .select(MUSIC_SELECT_FIELDS)
                .sort({ createdAt: -1 })
                .limit(parsedLimit);
        }
        // =========================
        // 🎵 FAVOURITES PLAYLIST
        // =========================
        else if (isFavPlaylist) {
            const baseQuery = { isFav: true };

            if (isRandom) {
                const randomSeed = Number(seed);
                if (isNaN(randomSeed)) {
                    return res.status(400).json({ error: "Invalid seed" });
                }

                let query = { ...baseQuery };
                if (cursor) query.stableRandom = { $gt: Number(cursor) };
                else query.stableRandom = { $gte: randomSeed };

                songs = await Music.find(query)
                    .select(`${MUSIC_SELECT_FIELDS} favAt stableRandom`)
                    .sort({ stableRandom: 1 })
                    .limit(parsedLimit);

                // 🔁 AUTO WRAP (no flags needed)
                if (songs.length < parsedLimit) {
                    const wrapQuery = cursor
                        ? { stableRandom: { $lte: Number(cursor) } }
                        : { stableRandom: { $lt: randomSeed } };

                    const extra = await Music.find({
                        ...baseQuery,
                        ...wrapQuery
                    })
                        .select(`${MUSIC_SELECT_FIELDS} favAt stableRandom`)
                        .sort({ stableRandom: 1 })
                        .limit(parsedLimit - songs.length);

                    songs = [...songs, ...extra];
                }
            } else {
                let query = { ...baseQuery };
                if (cursor) query.favAt = { $lt: new Date(Number(cursor)) };

                songs = await Music.find(query)
                    .select(`${MUSIC_SELECT_FIELDS} favAt`)
                    .sort({ favAt: -1 })
                    .limit(parsedLimit);
            }
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
                "_id title cover artist duration url createdAt ytId synced lyrics lyricsAsText isFav"
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
            }).select(MUSIC_SELECT_FIELDS);

            // preserve order
            const map = new Map(songsRaw.map(s => [s._id.toString(), s]));
            songs = songIds.map(id => map.get(id.toString())).filter(Boolean);
        }

        // =========================
        // 🎯 NEXT CURSOR
        // =========================
        let nextCursor = null;

        if (isSpecialPlaylist) {
            if (songs.length === parsedLimit)
                nextCursor = songs[songs.length - 1].createdAt.getTime();
        } else if (isRandom) {
            if (isArtistPlaylist || isFavPlaylist) {
                if (songs.length === parsedLimit)
                    nextCursor = songs[songs.length - 1].stableRandom;
            } else {
                if (mappings.length === parsedLimit)
                    nextCursor = mappings[mappings.length - 1].stableRandom;
            }
        } else if (isFavPlaylist) {
            if (songs.length === parsedLimit) {
                const lastSong = songs[songs.length - 1];
                nextCursor = lastSong.favAt ? lastSong.favAt.getTime() : lastSong.createdAt.getTime();
            }
        } else if (isArtistPlaylist) {
            if (songs.length === parsedLimit)
                nextCursor = songs[songs.length - 1].createdAt.getTime();
        } else {
            if (mappings.length === parsedLimit)
                nextCursor = mappings[mappings.length - 1].order;
        }

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


