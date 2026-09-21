import mongoose from "mongoose";
import Music from "../models/musics.js";
import { processVideoDownload } from "../utils/videoDownloader.js";
import { isVideoDownloadBlocked, logVideoDownload } from "../utils/videoCredits.js";

export const initVideoChangeListener = () => {
    try {
        console.log("[Change Stream] Initializing MongoDB Change Stream for Music collection...");

        // Watch the Music collection for changes
        const changeStream = Music.watch([
            { $match: { 'operationType': 'update' } }
        ]);

        changeStream.on('change', async (change) => {
            try {
                const updatedFields = change.updateDescription?.updatedFields;
                
                // We only care if 'isFav' was specifically set to true in this operation
                if (updatedFields && updatedFields.isFav === true) {
                    const songId = change.documentKey._id;
                    console.log(`[Change Stream] Detected 'isFav: true' update for song ID: ${songId}`);

                    // Fetch the full document to check for ytId and existing videoUrl
                    const song = await Music.findById(songId);
                    
                    if (!song) {
                        console.log(`[Change Stream] Song ${songId} not found in DB.`);
                        return;
                    }

                    if (!song.ytId) {
                        console.log(`[Change Stream] Song "${song.title}" (${songId}) has no ytId. Skipping video download.`);
                        return;
                    }

                    if (song.videoUrl) {
                        console.log(`[Change Stream] Song "${song.title}" (${songId}) already has a videoUrl. Skipping.`);
                        return;
                    }

                    // Check video Cloudinary credits before downloading
                    const creditCheck = await isVideoDownloadBlocked();
                    if (creditCheck.blocked) {
                        console.log(`[Change Stream] BLOCKED for "${song.title}": ${creditCheck.reason}`);
                        logVideoDownload(
                            song.title, song.ytId, song._id.toString(), 'BLOCKED',
                            creditCheck.reason, 'change_stream'
                        );
                        return;
                    }

                    console.log(`[Change Stream] Song "${song.title}" (${song.ytId}) is missing a video! Triggering background download...`);
                    
                    // Trigger the background download process directly
                    processVideoDownload(song._id, song.ytId).catch(err => {
                        console.error(`[Change Stream] Error during video processing for ${song.title}:`, err);
                    });
                }
            } catch (err) {
                console.error("[Change Stream] Error handling change event:", err);
            }
        });

        changeStream.on('error', (err) => {
            console.error("[Change Stream] Fatal error in Change Stream:", err);
        });

        console.log("[Change Stream] Successfully listening for favorite toggles in real-time.");
    } catch (err) {
        console.error("[Change Stream] Failed to initialize:", err);
    }
};
