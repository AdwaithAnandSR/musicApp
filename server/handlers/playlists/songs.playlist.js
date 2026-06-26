import Music from "../../models/musics.js";
import PlaylistSong from "../../models/playlistSong.js";

import mongoose from "mongoose";

export const getSongs = async (req, res) => {
try {
const { playlistId, cursor, limit = 50, random, seed } = req.query;

console.log("📋 getSongs called with:", {
  playlistId,
  cursor,
  limit,
  random,
  seed,
  timestamp: new Date().toISOString()
});

const isRandom = random === "true";  
const isSpecialPlaylist = playlistId === "6a3e689cfba948ae55682fe3";
const useNewestOrder = isSpecialPlaylist || isRandom;

console.log("🔍 Playlist classification:", {
  isRandom,
  isSpecialPlaylist,
  useNewestOrder
});

    const parsedLimit = Number(limit);  
    const playlistObjectId = new mongoose.Types.ObjectId(playlistId);  

    console.log("🎯 Query setup:", {
      parsedLimit,
      playlistObjectId: playlistObjectId.toString()
    });

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

        console.log("🆕 Using newest order (special or random)");

        if (isRandom) {
            console.log("🎲 Random mode query building...");
            if (cursor) {  
                query.stableRandom = { $gt: Number(cursor) };  
                console.log("  With cursor:", query);
            } else {  
                query.stableRandom = { $gte: randomSeed };  
                console.log("  Without cursor, with seed:", query);
            }  

            // first fetch  
            mappings = await PlaylistSong.find(query)  
                .sort({ stableRandom: 1 })  
                .limit(parsedLimit);  

            console.log("  First fetch result:", {
              count: mappings.length,
              query,
              sort: { stableRandom: 1 }
            });

            // 🔁 AUTO WRAP (no flags needed)  
            if (mappings.length < parsedLimit) {  
                const wrapQuery = cursor  
                    ? { stableRandom: { $lte: Number(cursor) } }  
                    : { stableRandom: { $lt: randomSeed } };  

                console.log("  Wrap query:", { wrapQuery, currentCount: mappings.length, needed: parsedLimit });

                const extra = await PlaylistSong.find({  
                    playlistId: playlistObjectId,  
                    ...wrapQuery  
                })  
                    .sort({ stableRandom: 1 })  
                    .limit(parsedLimit - mappings.length);  

                console.log("  Wrap result:", extra.length);

                mappings = [...mappings, ...extra];  
            }
        } else {
            // Special playlist: newest songs first (reverse insertion order)
            console.log("🎵 Special playlist mode - fetching with order descending");
            if (cursor) {
                query.order = { $gt: Number(cursor) };
                console.log("  With cursor:", query);
            } else {
                console.log("  Without cursor:", query);
            }

            mappings = await PlaylistSong.find(query)
                .sort({ order: -1 })
                .limit(parsedLimit);

            console.log("  Special playlist fetch result:", {
              count: mappings.length,
              query,
              sort: { order: -1 },
              firstOrder: mappings[0]?.order,
              lastOrder: mappings[mappings.length - 1]?.order
            });
        }
    }  

    // =========================  
    // 📜 NORMAL MODE  
    // =========================  
    else {  
        console.log("📖 Normal mode - paginating by order");
        let query = { playlistId: playlistObjectId };  

        if (cursor) {  
            query.order = { $lt: Number(cursor) };  
            console.log("  With cursor:", query);
        } else {
            console.log("  Without cursor:", query);
        }

        mappings = await PlaylistSong.find(query)  
            .sort({ order: -1 })  
            .limit(parsedLimit);

        console.log("  Normal mode fetch result:", {
          count: mappings.length,
          query
        });
    }  

    console.log("📊 Total PlaylistSong mappings found:", {
      count: mappings.length,
      songIds: mappings.slice(0, 3).map(m => m.songId.toString())
    });

    // =========================  
    // 🎵 FETCH SONGS  
    // =========================  
    const songIds = mappings.map(m => m.songId);  

    console.log("🔎 Fetching Music documents for songIds:", {
      count: songIds.length,
      sampleIds: songIds.slice(0, 3).map(id => id.toString())
    });

    const songsRaw = await Music.find({  
        _id: { $in: songIds }  
    }).select("_id title cover artist duration url createdAt ytId synced lyrics lyricsAsText");  

    console.log("🎶 Music documents found:", {
      count: songsRaw.length,
      sampleSongs: songsRaw.slice(0, 2).map(s => ({ id: s._id.toString(), title: s.title }))
    });

    // preserve order  
    const map = new Map(songsRaw.map(s => [s._id.toString(), s]));  
    const songs = songIds.map(id => map.get(id.toString())).filter(Boolean);  

    console.log("✅ Final songs after ordering:", {
      count: songs.length,
      mapSize: map.size,
      missingSongs: songIds.length - songs.length
    });

    // =========================  
    // 🎯 NEXT CURSOR  
    // =========================  
    const nextCursor =  
        mappings.length === parsedLimit  
            ? isRandom  
                ? mappings[mappings.length - 1].stableRandom  
                : mappings[mappings.length - 1].order  
            : null;  

    console.log("📍 Pagination info:", {
      nextCursor,
      mappingsCount: mappings.length,
      parsedLimit,
      hasMore: mappings.length === parsedLimit
    });

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