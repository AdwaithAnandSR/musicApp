import Music from "../models/musics.js";
import { processVideoDownload } from "../utils/videoDownloader.js";

export const syncFavoriteVideos = async () => {
    try {
        console.log("[Video Sync] Checking for favorited songs without videoUrls...");
        const songs = await Music.find({
            isFav: true,
            ytId: { $exists: true, $ne: null },
            $or: [
                { videoUrl: { $exists: false } },
                { videoUrl: null },
                { videoUrl: "" }
            ]
        });
        
        console.log(`[Video Sync] Found ${songs.length} favorited songs without videoUrl to process.`);

        for (const song of songs) {
            console.log(`[Video Sync] Processing ${song.title} (${song.ytId})`);
            try {
                // Awaiting each to avoid spiking memory/cpu and getting rate limited by YT or Cloudinary
                await processVideoDownload(song._id, song.ytId);
            } catch (err) {
                console.error(`[Video Sync] Failed for ${song.title}:`, err);
            }
        }
        
        console.log("[Video Sync] Daily video sync completed.");
    } catch (err) {
        console.error("[Video Sync] Error:", err);
    }
};
