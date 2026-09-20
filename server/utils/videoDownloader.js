import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { v2 as cloudinary } from "cloudinary";
import musicModel from "../models/musics.js";
import AppDetail from "../models/appDetails.js";

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
            else reject(new Error(`Command failed with code ${code}:\n${stderr.slice(-MAX_LOG_CHARS)}`));
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

const writeCookieFile = (netscapeContent) => {
    if (!netscapeContent) return null;
    const cookiePath = path.resolve(
        process.cwd(),
        `cookies-vid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.txt`
    );
    fs.writeFileSync(cookiePath, netscapeContent, { mode: 0o600 });
    return cookiePath;
};

export const processVideoDownload = async (songId, ytId) => {
    const { command, prefix, env } = getYtDlpRunner();
    const downloadDir = path.resolve(process.cwd(), "downloads");
    if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });

    const jobId = Math.random().toString(36).slice(2, 9);
    const filePrefix = `vid_${ytId}_${jobId}`;
    const rawVideoPath = path.join(downloadDir, `${filePrefix}_raw.mp4`);
    const processedVideoPath = path.join(downloadDir, `${filePrefix}_processed.mp4`);

    let cookieFile = null;
    try {
        const cookies = await loadCookiesFromDb();
        if (cookies) cookieFile = writeCookieFile(cookies);
    } catch (e) {}

    const cookieArgs = cookieFile ? ["--cookies", cookieFile] : [];

    try {
        console.log(`[Video Download] Started for ytId: ${ytId}`);

        // 1. Download best video stream (no audio) max 1080p to allow good 720x1280 crop
        // Wait, bestvideo[ext=mp4] is good. 
        const dlArgs = [
            ...prefix,
            "-f", "bestvideo[height<=1080][ext=mp4]/bestvideo[ext=mp4]/best[ext=mp4]",
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
            "-o", rawVideoPath,
            ...cookieArgs,
            `https://www.youtube.com/watch?v=${ytId}`
        ];

        console.log(`[Video Download] Downloading raw video for ${ytId}...`);
        await runCommand(command, dlArgs, true, env);

        if (!fs.existsSync(rawVideoPath)) {
            throw new Error("Raw video file not found after yt-dlp download");
        }

        console.log(`[Video Download] Processing video with ffmpeg...`);
        
        // 2. Process with ffmpeg
        // crop/scale to portrait 9:16 (720x1280)
        // preserve aspect ratio, crop excess
        // remove audio (-an)
        // H.264 mp4
        const ffmpegArgs = [
            "-i", rawVideoPath,
            "-vf", "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280",
            "-an",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "28",
            "-y",
            processedVideoPath
        ];

        await runCommand("ffmpeg", ffmpegArgs, true);

        if (!fs.existsSync(processedVideoPath)) {
            throw new Error("Processed video file not found after ffmpeg");
        }

        // 3. Upload to Cloudinary using _VIDEO credentials
        console.log(`[Video Download] Uploading to Cloudinary...`);
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME_VIDEO;
        const apiKey = process.env.CLOUDINARY_API_KEY_VIDEO;
        const apiSecret = process.env.CLOUDINARY_API_SECRET_VIDEO ;

        const uploadResult = await cloudinary.uploader.upload(processedVideoPath, {
            resource_type: "video",
            folder: "musicApp/backgrounds",
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret
        });

        const videoUrl = uploadResult.secure_url;

        // 4. Save to DB
        await musicModel.findByIdAndUpdate(songId, { videoUrl });
        console.log(`[Video Download] Successfully updated videoUrl for song ${songId}`);

    } catch (err) {
        console.error(`[Video Download] Error processing video for ${ytId}:`, err);
    } finally {
        if (cookieFile && fs.existsSync(cookieFile)) {
            try { fs.unlinkSync(cookieFile); } catch (e) {}
        }
        try { if (fs.existsSync(rawVideoPath)) fs.unlinkSync(rawVideoPath); } catch (e) {}
        try { if (fs.existsSync(processedVideoPath)) fs.unlinkSync(processedVideoPath); } catch (e) {}
        
        // clean up any other files yt-dlp might have left (like .part)
        try {
            const currentFiles = fs.readdirSync(downloadDir);
            currentFiles.forEach(f => {
                if (f.startsWith(filePrefix)) fs.unlinkSync(path.join(downloadDir, f));
            });
        } catch (e) {}
    }
};
