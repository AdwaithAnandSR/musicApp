if (!global.activeVideoDownloads) global.activeVideoDownloads = {};
if (!global.videoJobs) global.videoJobs = {};
if (!global.videoJobQueue) global.videoJobQueue = [];
if (typeof global.activeGithubJobs === 'undefined') global.activeGithubJobs = 0;

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import musicModel from "../models/musics.js";
import AppDetail from "../models/appDetails.js";
import { isVideoDownloadBlocked, logVideoDownload } from './videoCredits.js';

const MAX_LOG_CHARS = 4000;

const getYtDlpRunner = () => {
    const renderPath = "/opt/render/project/src/yt-dlp-package";
    if (fs.existsSync(renderPath)) {
        return {
            command: "python3",
            prefix: ["-m", "yt_dlp"],
            env: { ...process.env, PYTHONPATH: renderPath }
        };
    }

    const candidatePaths = [
        path.resolve(process.cwd(), "bin", "yt-dlp"),
        path.resolve(process.cwd(), "server", "bin", "yt-dlp"),
        path.resolve(process.cwd(), "..", "bin", "yt-dlp")
    ];

    for (const binPath of candidatePaths) {
        if (fs.existsSync(binPath)) {
            return { command: "python3", prefix: [binPath] };
        }
    }
    return { command: "yt-dlp", prefix: [] };
};

const runCommand = (command, args, ignoreOutput = false, env = undefined) => {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, env ? { env } : undefined);
        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", data => {
            if (!ignoreOutput) stdout += data.toString();
        });

        proc.stderr.on("data", data => {
            stderr += data.toString();
            if (stderr.length > MAX_LOG_CHARS * 2) {
                stderr = stderr.slice(-MAX_LOG_CHARS * 2);
            }
        });

        proc.on("close", code => {
            if (code === 0) resolve(stdout);
            else
                reject(
                    new Error(
                        `Command failed with code ${code}:\n${stderr.slice(-MAX_LOG_CHARS)}`
                    )
                );
        });
        proc.on("error", err => reject(err));
    });
};

const loadCookiesFromDb = async () => {
    try {
        const doc = await AppDetail.findOne({ key: "youtube_cookies" });
        return doc?.data || null;
    } catch (err) {
        return null;
    }
};

const writeCookieFile = netscapeContent => {
    if (!netscapeContent) return null;
    const cookiePath = path.resolve(
        process.cwd(),
        `cookies-vid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.txt`
    );
    fs.writeFileSync(cookiePath, netscapeContent, { mode: 0o600 });
    return cookiePath;
};

const triggerGithubAction = async (jobId) => {
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;
    if (!token || !repo) {
        console.warn("[Video Download] GITHUB_TOKEN or GITHUB_REPO not set.");
        throw new Error("GitHub configuration missing");
    }

    const host = process.env.PUBLIC_API_URL || "http://localhost:5000";
    const response = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/process-video.yml/dispatches`, {
        method: 'POST',
        headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `Bearer ${token}`,
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ref: 'main',
            inputs: {
                jobId: jobId,
                apiBase: host
            }
        })
    });

    if (!response.ok) {
        const txt = await response.text();
        throw new Error(`GitHub API error: ${response.status} ${txt}`);
    }
};

global.processNextVideoJob = async () => {
    if (global.activeGithubJobs >= 5) return;
    if (global.videoJobQueue.length === 0) return;
    
    const job = global.videoJobQueue.shift();
    global.activeGithubJobs++;
    
    try {
        console.log(`[Queue] Triggering GitHub Action for job ${job.jobId} (ytId: ${job.ytId})`);
        await triggerGithubAction(job.jobId);
    } catch (err) {
        console.error(`[Queue] Failed to trigger GitHub Action:`, err);
        global.activeGithubJobs--;
        if (global.activeVideoDownloads && global.activeVideoDownloads[job.ytId]) {
            delete global.activeVideoDownloads[job.ytId];
        }
        delete global.videoJobs[job.jobId];
        try { if (fs.existsSync(job.rawVideoPath)) fs.unlinkSync(job.rawVideoPath); } catch (e) {}
        
        global.processNextVideoJob();
    }
};

export const processVideoDownload = async (songId, ytId, onProgress = () => {}) => {
    let internalOnProgress = (data) => {
        global.activeVideoDownloads[ytId] = { ...data, ytId, songId };
        onProgress(data);
    };
    global.activeVideoDownloads[ytId] = { message: 'Initializing...', percent: 0, startedAt: Date.now(), ytId, songId };

    console.log("start processing");

    const creditCheck = await isVideoDownloadBlocked();
    if (creditCheck.blocked) {
        console.log(`[Video Download] BLOCKED: ${creditCheck.reason}`);
        logVideoDownload(
            'Unknown', ytId, songId, 'BLOCKED',
            creditCheck.reason, 'individual'
        );
        delete global.activeVideoDownloads[ytId];
        return;
    }

    const { command, prefix, env } = getYtDlpRunner();
    const downloadDir = path.resolve(process.cwd(), "downloads");
    if (!fs.existsSync(downloadDir))
        fs.mkdirSync(downloadDir, { recursive: true });

    const jobId = Math.random().toString(36).slice(2, 9);
    const filePrefix = `vid_${ytId}_${jobId}`;
    const rawVideoPath = path.join(downloadDir, `${filePrefix}_raw.mp4`);

    let cookieFile = null;
    try {
        const cookies = await loadCookiesFromDb();
        if (cookies) cookieFile = writeCookieFile(cookies);
    } catch (e) {}

    const cookieArgs = cookieFile ? ["--cookies", cookieFile] : [];

    try {
        console.log(`[Video Download] Started for ytId: ${ytId}`);

        const dlArgs = [
            ...prefix,
            "-f",
            "bestvideo[height<=1080][ext=mp4]/bestvideo[ext=mp4]/best[ext=mp4]",
            "--no-playlist",
            "--no-cache-dir",
            "--no-progress",
            "--js-runtimes",
            "node",
            "--retries",
            "3",
            "--fragment-retries",
            "3",
            "--socket-timeout",
            "30",
            "-o",
            rawVideoPath,
            ...cookieArgs,
            `https://www.youtube.com/watch?v=${ytId}`
        ];

        console.log(`[Video Download] Downloading raw video for ${ytId}...`);
        internalOnProgress({ message: 'Downloading from YouTube...', percent: 0, startedAt: Date.now() });
        await runCommand(command, dlArgs, true, env);

        if (!fs.existsSync(rawVideoPath)) {
            throw new Error("Raw video file not found after yt-dlp download");
        }
        
        // Clean up cookie immediately since yt-dlp is done
        if (cookieFile && fs.existsSync(cookieFile)) {
            try { fs.unlinkSync(cookieFile); } catch (e) {}
            cookieFile = null;
        }

        const songDoc = await musicModel.findById(songId);
        const durationSec = songDoc ? (songDoc.duration || 0) : 0;
        
        internalOnProgress({ message: 'Analyzing video for static content...', percent: 0, startedAt: Date.now() });
        const { detectStaticVideo } = await import('./staticVideoDetector.js');
        const detectionResult = await detectStaticVideo(rawVideoPath, durationSec);
        
        if (detectionResult.isStatic) {
            console.log(`[Video Download] Static video detected for ${ytId} — skipping processing.`);
            logVideoDownload(
                songDoc ? songDoc.title : 'Video',
                ytId,
                songId,
                'SKIPPED_STATIC',
                `Static detection: STATIC, similarity=${detectionResult.minSsim}`,
                'individual'
            );
            
            // Clean up raw video
            try { if (fs.existsSync(rawVideoPath)) fs.unlinkSync(rawVideoPath); } catch (e) {}
            delete global.activeVideoDownloads[ytId];
            
            return; // Exit early, no need to trigger GitHub Actions
        } else {
            console.log(`[Static Detection] MOVING, similarity=${detectionResult.minSsim}`);
        }

        // Register the job
        return new Promise((resolve, reject) => {
            global.videoJobs[jobId] = {
            jobId,
            ytId,
            songId,
            rawVideoPath,
            durationSec,
            timestamp: Date.now(),
                onProgress: internalOnProgress,
                resolve,
                reject
        };
        
        // Enqueue the GitHub Actions trigger
        global.videoJobQueue.push(global.videoJobs[jobId]);
        
        internalOnProgress({ message: 'Queued for processing...', percent: 0, startedAt: Date.now() });
        
        // Timeout cleanup (60 minutes)
        setTimeout(() => {
            const job = global.videoJobs[jobId];
            if (job) {
                console.log(`[Job Timeout] Cleaning up orphaned job ${jobId}`);
                delete global.videoJobs[jobId];
                if (global.activeVideoDownloads[ytId]) {
                    delete global.activeVideoDownloads[ytId];
                }
                if (fs.existsSync(job.rawVideoPath)) {
                    try { fs.unlinkSync(job.rawVideoPath); } catch (e) {}
                }
                logVideoDownload('Video', ytId, songId, 'ERROR', 'Processing timed out after 60 minutes', 'individual');
                    reject(new Error('Processing timed out after 60 minutes'));
            }
        }, 60 * 60 * 1000);
        
        // Trigger queue processing
        global.processNextVideoJob();
        });

    } catch (err) {
        console.error(
            `[Video Download] Error processing video for ${ytId}:`,
            err
        );
        logVideoDownload(
            'Video', ytId, songId, 'ERROR',
            err.message || 'Unknown error', 'individual'
        );
        
        delete global.activeVideoDownloads[ytId];
        if (cookieFile && fs.existsSync(cookieFile)) {
            try { fs.unlinkSync(cookieFile); } catch (e) {}
        }
        try { if (fs.existsSync(rawVideoPath)) fs.unlinkSync(rawVideoPath); } catch (e) {}
    }
};
