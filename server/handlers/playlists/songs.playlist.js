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

console.log("🔍 Playlist classification:", {
  isRandom,
  isSpecialPlaylist
});

    const parsedLimit = Number(limit);  
    const playlistObjectId = new mongoose.Types.ObjectId(playlistId);  

    console.log("🎯 Query setup:", {
      parsedLimit,
      playlistObjectId: playlistObjectId.toString()
    });

    let songs = [];  

    // =========================  
    // 🎵 SPECIAL PLAYLIST (DIRECT MUSIC ACCESS - NEWEST FIRST)
    // =========================  
    if (isSpecialPlaylist) {
        console.log("🎵 Special playlist mode - direct Music model access by createdAt");
        
        let query = {};

        if (cursor) {
            query.createdAt = { $lt: new Date(Number(cursor)) };
            console.log("  With cursor:", { cursorDate: new Date(Number(cursor)) });
        } else {
            console.log("  Without cursor - fetching newest songs");
        }

        songs = await Music.find(query)
            .select("_id title cover artist duration url createdAt ytId synced lyrics lyricsAsText")
            .sort({ createdAt: -1 })
            .limit(parsedLimit);

        console.log("  Special playlist fetch result:", {
          count: songs.length,
          query,
          sort: { createdAt: -1 },
          firstCreatedAt: songs[0]?.createdAt,
          lastCreatedAt: songs[songs.length - 1]?.createdAt
        });
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

        console.log("🆕 Using random mode");
        console.log("🎲 Random mode query building...");
        
        if (cursor) {  
            query.stableRandom = { $gt: Number(cursor) };  
            console.log("  With cursor:", query);
        } else {  
            query.stableRandom = { $gte: randomSeed };  
            console.log("  Without cursor, with seed:", query);
        }  

        // first fetch  
        let mappings = await PlaylistSong.find(query)  
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

        console.log("📊 Total PlaylistSong mappings found:", {
          count: mappings.length,
          songIds: mappings.slice(0, 3).map(m => m.songId.toString())
        });

        // Fetch songs from Music model
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
        songs = songIds.map(id => map.get(id.toString())).filter(Boolean);  

        console.log("✅ Final songs after ordering:", {
          count: songs.length,
          mapSize: map.size,
          missingSongs: songIds.length - songs.length
        });
    }  
    // =========================  
    // 📜 NORMAL MODE  
    // =========================  
    else {  
        console.log("📖 Normal mode - paginating by PlaylistSong order");
        let query = { playlistId: playlistObjectId };  

        if (cursor) {  
            query.order = { $lt: Number(cursor) };  
            console.log("  With cursor:", query);
        } else {
            console.log("  Without cursor:", query);
        }

        let mappings = await PlaylistSong.find(query)  
            .sort({ order: -1 })  
            .limit(parsedLimit);

        console.log("  Normal mode fetch result:", {
          count: mappings.length,
          query
        });

        console.log("📊 Total PlaylistSong mappings found:", {
          count: mappings.length,
          songIds: mappings.slice(0, 3).map(m => m.songId.toString())
        });

        // Fetch songs from Music model
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
        songs = songIds.map(id => map.get(id.toString())).filter(Boolean);  

        console.log("✅ Final songs after ordering:", {
          count: songs.length,
          mapSize: map.size,
          missingSongs: songIds.length - songs.length
        });
    }

    // =========================  
    // 🎯 NEXT CURSOR  
    // =========================  
    let nextCursor = null;
    
    if (songs.length === parsedLimit) {
        if (isSpecialPlaylist) {
            // For special playlist, use createdAt as cursor (convert to timestamp)
            nextCursor = songs[songs.length - 1].createdAt.getTime();
            console.log("📍 Special playlist cursor:", { nextCursor, lastSongCreatedAt: songs[songs.length - 1].createdAt });
        } else {
            console.log("📍 Pagination info:", {
              nextCursor,
              songsCount: songs.length,
              parsedLimit,
              hasMore: songs.length === parsedLimit
            });
        }
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