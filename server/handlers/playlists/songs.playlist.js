import Music from "../../models/musics.js";
import PlaylistSong from "../../models/playlistSong.js";

import mongoose from "mongoose";

export const getSongs = async (req, res) => {
try {
const { playlistId, cursor, limit = 50, random, seed } = req.query;

const isRandom = random === "true";  
const isSpecialPlaylist = playlistId === "6a3e689cfba948ae55682fe3";
const useNewestOrder = isSpecialPlaylist || isRandom;
    const parsedLimit = Number(limit);  
    const playlistObjectId = new mongoose.Types.ObjectId(playlistId);  

    let mappings = [];  

    // =========================  
    // 🔀 RANDOM MODE (SIMPLIFIED) / SPECIAL PLAYLIST (NEWEST ORDER)
    // =========================  
    if (useNewestOrder) {  
        const randomSeed = Number(seed);  
        if (!isSpecialPlaylist && isNaN(randomSeed)) {  
            return res.status(400).json({ error: "Invalid seed" });  
        }  

        let query = { playlistId: playlistObjectId };  

        if (isRandom) {
            if (cursor) {  
                query.stableRandom = { $gt: Number(cursor) };  
            } else {  
                query.stableRandom = { $gte: randomSeed };  
            }  

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
        } else {
            // Special playlist: newest songs first (reverse insertion order)
            if (cursor) {
                query.order = { $gt: Number(cursor) };
            }

            mappings = await PlaylistSong.find(query)
                .sort({ order: -1 })
                .limit(parsedLimit);
        }
    }  

    // =========================  
    // 📜 NORMAL MODE  
    // =========================  
    else {  
        let query = { playlistId: playlistObjectId };  

        if (cursor) {  
            query.order = { $lt: Number(cursor) };  
        }  

        mappings = await PlaylistSong.find(query)  
            .sort({ order: -1 })  
            .limit(parsedLimit);  
    }  

    // =========================  
    // 🎵 FETCH SONGS  
    // =========================  
    const songIds = mappings.map(m => m.songId);  

    const songsRaw = await Music.find({  
        _id: { $in: songIds }  
    }).select("_id title cover artist duration url createdAt ytId synced lyrics lyricsAsText");  

    // preserve order  
    const map = new Map(songsRaw.map(s => [s._id.toString(), s]));  
    const songs = songIds.map(id => map.get(id.toString())).filter(Boolean);  

    // =========================  
    // 🎯 NEXT CURSOR  
    // =========================  
    const nextCursor =  
        mappings.length === parsedLimit  
            ? isRandom  
                ? mappings[mappings.length - 1].stableRandom  
                : mappings[mappings.length - 1].order  
            : null;  

    res.json({  
        musics: songs,  
        nextCursor  
    });  
} catch (err) {  
    console.error("getSongs error:", err);  
    res.status(500).json({ error: "Internal server error" });  
}

};

export default getSongs;
