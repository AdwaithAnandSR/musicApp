import Music from "../models/musics.js";
import { processVideoDownload } from "../utils/videoDownloader.js";
import {
    isVideoDownloadBlocked,
    logVideoDownload,
    updateVideoSyncStatus,
    logVideoSyncRun
} from "../utils/videoCredits.js";

export const syncFavoriteVideos = async () => {
    const runId = Math.random().toString(36).slice(2, 9);
    const startedAt = new Date().toISOString();
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    let blockedByCredits = false;

    try {
        // Check credits before starting
        const creditCheck = await isVideoDownloadBlocked();
        if (creditCheck.blocked) {
            console.log(`[Video Sync] BLOCKED: ${creditCheck.reason}`);
            await updateVideoSyncStatus({
                isSyncing: false,
                blocked: true,
                blockedReason: creditCheck.reason,
                message: "Blocked by credit limit"
            });
            await logVideoSyncRun({
                id: runId,
                startedAt,
                completedAt: new Date().toISOString(),
                totalProcessed: 0,
                successCount: 0,
                errorCount: 0,
                skippedCount: 0,
                blockedByCredits: true,
                type: "daily_sync",
                status: "BLOCKED"
            });
            return;
        }

        console.log(
            "[Video Sync] Checking for favorited songs without videoUrls..."
        );
        const songs = await Music.find({
            isFav: true,
            ytId: { $exists: true, $ne: null },
            $or: [
                { videoUrl: { $exists: false } },
                { videoUrl: null },
                { videoUrl: "" }
            ]
        });

        console.log(
            `[Video Sync] Found ${songs.length} favorited songs without videoUrl to process.`
        );

        await updateVideoSyncStatus({
            isSyncing: true,
            startedAt,
            totalSongs: songs.length,
            currentSongIndex: 0,
            currentSongTitle: "",
            successCount: 0,
            errorCount: 0,
            skippedCount: 0,
            message: "Starting video sync..."
        });

        for (let i = 0; i < songs.length; i++) {
            const song = songs[i];
            console.log(
                `[Video Sync] Processing ${song.title} (${song.ytId})`
            );

            // Re-check credits before each download
            const recheck = await isVideoDownloadBlocked();
            if (recheck.blocked) {
                console.log(
                    `[Video Sync] BLOCKED mid-sync: ${recheck.reason}`
                );
                blockedByCredits = true;
                skippedCount += songs.length - i;
                await updateVideoSyncStatus({
                    isSyncing: false,
                    blocked: true,
                    blockedReason: recheck.reason,
                    totalSongs: songs.length,
                    currentSongIndex: i,
                    successCount,
                    errorCount,
                    skippedCount,
                    message: `Stopped: ${recheck.reason}`
                });
                logVideoDownload(
                    song.title,
                    song.ytId,
                    song._id.toString(),
                    "BLOCKED",
                    recheck.reason,
                    "daily_sync"
                );
                break;
            }

            await updateVideoSyncStatus({
                isSyncing: true,
                startedAt,
                totalSongs: songs.length,
                currentSongIndex: i + 1,
                currentSongTitle: song.title,
                successCount,
                errorCount,
                skippedCount,
                message: `Processing: ${song.title}`
            });

            try {
                const itemStartedAt = new Date().toISOString();
                await processVideoDownload(song._id, song.ytId, async (progressData) => {
                    await updateVideoSyncStatus({
                        isSyncing: true,
                        startedAt,
                        totalSongs: songs.length,
                        currentSongIndex: i + 1,
                        currentSongTitle: song.title,
                        successCount,
                        errorCount,
                        skippedCount,
                        message: `Processing: ${song.title}`,
                        itemMessage: progressData.message,
                        itemProgress: progressData.percent,
                        itemStartedAt
                    });
                });
                successCount++;
            } catch (err) {
                console.error(
                    `[Video Sync] Failed for ${song.title}:`,
                    err
                );
                errorCount++;
            }
        }

        console.log("[Video Sync] Daily video sync completed.");
    } catch (err) {
        console.error("[Video Sync] Error:", err);
        errorCount++;
    } finally {
        await updateVideoSyncStatus({
            isSyncing: false,
            blocked: blockedByCredits,
            blockedReason: blockedByCredits
                ? "Credit limit reached (20/25)"
                : "",
            totalSongs: successCount + errorCount + skippedCount,
            successCount,
            errorCount,
            skippedCount,
            message: blockedByCredits ? "Stopped by credit limit" : "Completed"
        });

        await logVideoSyncRun({
            id: runId,
            startedAt,
            completedAt: new Date().toISOString(),
            totalProcessed: successCount + errorCount + skippedCount,
            successCount,
            errorCount,
            skippedCount,
            blockedByCredits,
            type: "daily_sync",
            status: blockedByCredits
                ? "BLOCKED"
                : errorCount > 0 && successCount === 0
                  ? "ERROR"
                  : "COMPLETED"
        });
    }
};
