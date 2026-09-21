import express from "express";
import fs from "fs";
import path from "path";
import musicModel from "../models/musics.js";
import { logVideoDownload } from "../utils/videoCredits.js";

const router = express.Router();

router.get("/video-job/:jobId", (req, res) => {
    const { jobId } = req.params;
    const job = global.videoJobs && global.videoJobs[jobId];
    if (!job) return res.status(404).json({ error: "Job not found" });

    // Important: Cloudinary credentials passed securely
    res.json({
        rawVideoUrl: `${process.env.PUBLIC_API_URL || "http://" + req.headers.host}/internal/video-download/${jobId}`,
        durationSec: job.durationSec,
        ytId: job.ytId,
        songId: job.songId,
        cloudinary: {
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME_VIDEO,
            api_key: process.env.CLOUDINARY_API_KEY_VIDEO,
            api_secret: process.env.CLOUDINARY_API_SECRET_VIDEO
        }
    });
});

router.get("/video-download/:jobId", (req, res) => {
    const { jobId } = req.params;
    const job = global.videoJobs && global.videoJobs[jobId];
    if (!job) return res.status(404).json({ error: "Job not found" });

    if (fs.existsSync(job.rawVideoPath)) {
        res.sendFile(job.rawVideoPath);
    } else {
        res.status(404).json({ error: "File not found on disk" });
    }
});

router.post("/video-callback/:jobId/progress", (req, res) => {
    const { jobId } = req.params;
    const { message, percent, startedAt } = req.body;
    
    const job = global.videoJobs && global.videoJobs[jobId];
    if (!job) return res.status(404).json({ error: "Job not found" });

    if (!global.activeVideoDownloads) global.activeVideoDownloads = {};
    
    if (job.onProgress) job.onProgress({ message, percent, startedAt });
    if (job.onProgress) job.onProgress({ message, percent, startedAt });
    global.activeVideoDownloads[job.ytId] = {
        message: message,
        percent: percent,
        startedAt: startedAt,
        ytId: job.ytId,
        songId: job.songId
    };
    
    res.json({ success: true });
});

router.post("/video-callback/:jobId/status", async (req, res) => {
    const { jobId } = req.params;
    const { status, videoUrl, error } = req.body;
    
    const job = global.videoJobs && global.videoJobs[jobId];
    if (!job) return res.status(404).json({ error: "Job not found" });

    const { ytId, songId, rawVideoPath } = job;
    
    try {
        if (status === 'success') {
            await musicModel.findByIdAndUpdate(songId, { videoUrl });
            logVideoDownload('Video', ytId, songId, 'SUCCESS', `Uploaded to Cloudinary: ${videoUrl}`, 'individual');
            console.log(`[GitHub Actions Callback] Successfully updated videoUrl for song ${songId}`);
            if (job.resolve) job.resolve();
            if (job.resolve) job.resolve();
        } else {
            console.error(`[GitHub Actions Callback] Error processing video for ${ytId}:`, error);
            logVideoDownload('Video', ytId, songId, 'ERROR', error || 'Unknown error', 'individual');
            if (job.reject) job.reject(new Error(error || 'Unknown error'));
        }
    } catch (err) {
        console.error("[GitHub Actions Callback] DB Error:", err);
    } finally {
        if (global.activeVideoDownloads && global.activeVideoDownloads[ytId]) {
            delete global.activeVideoDownloads[ytId];
        }
        if (fs.existsSync(rawVideoPath)) {
            try { fs.unlinkSync(rawVideoPath); } catch (e) {}
        }
        
        // Remove from map
        delete global.videoJobs[jobId];
        
        global.activeGithubJobs = Math.max(0, (global.activeGithubJobs || 0) - 1);
        // Trigger next job in queue if any
        if (global.processNextVideoJob) {
            global.processNextVideoJob();
        }
        
        res.json({ success: true });
    }
});

export default router;
