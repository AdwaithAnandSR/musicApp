import Music from "../../models/musics.js";
import PlaylistSong from "../../models/playlistSong.js";

import mongoose from "mongoose";

export const getSongs = async (req, res) => {
try {
const { playlistId, cursor, limit = 50, random, seed } = req.query;

const isRandom = random === "true";  
    const parsedLimit = Number(limit);  
    const playlistObjectId = new mongoose.Types.ObjectId(playlistId);  

    let mappings = [];  

    // =========================  
    // 🔀 RANDOM MODE (SIMPLIFIED)  
    // =========================  
    if (isRandom) {  
        const randomSeed = Number(seed);  
        if (isNaN(randomSeed)) {  
            return res.status(400).json({ error: "Invalid seed" });  
        }  

        let query = { playlistId: playlistObjectId };  

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
    }).select("_id title cover artist duration url createdAt");  

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
