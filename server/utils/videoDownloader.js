
if (!global.activeVideoDownloads) global.activeVideoDownloads = {};
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { v2 as cloudinary } from "cloudinary";
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



const runFfmpeg = async (input, output, durationSec, onProgress) => {
    // Pass 1: cropdetect
    onProgress({ message: 'Detecting borders...', percent: 0, startedAt: Date.now() });
    
    let cropVal = null;
    try {
        const detectArgs = [
            '-y', '-ss', '00:00:15', '-i', input,
            '-t', '2',
            '-vf', 'cropdetect=24:16:0',
            '-f', 'null', '-'
        ];
        
        const detectOut = await new Promise((resolve, reject) => {
            const proc = spawn('ffmpeg', detectArgs);
            let stderr = '';
            proc.stderr.on('data', d => stderr += d.toString());
            proc.on('close', code => resolve(stderr));
            proc.on('error', reject);
        });
        
        const matches = detectOut.match(/crop=(\d+:\d+:\d+:\d+)/g);
        if (matches && matches.length > 0) {
            cropVal = matches[matches.length - 1];
        }
    } catch(e) {
        console.error('[FFmpeg] cropdetect failed:', e);
    }
    
    // Fallback detection without -ss if 15s seek failed (e.g., short video)
    if (!cropVal) {
        try {
            const detectArgs = [
                '-y', '-i', input,
                '-t', '2',
                '-vf', 'cropdetect=24:16:0',
                '-f', 'null', '-'
            ];
            const detectOut = await new Promise((resolve, reject) => {
                const proc = spawn('ffmpeg', detectArgs);
                let stderr = '';
                proc.stderr.on('data', d => stderr += d.toString());
                proc.on('close', code => resolve(stderr));
                proc.on('error', reject);
            });
            const matches = detectOut.match(/crop=(\d+:\d+:\d+:\d+)/g);
            if (matches && matches.length > 0) {
                cropVal = matches[matches.length - 1];
            }
        } catch(e) {}
    }
    
    // Construct final filter chain
    // If cropVal found (e.g. crop=1920:800:0:140), apply it first, then crop to 9:16 portrait.
    // The second crop min(ow, ih*9/16):ih ensures it fits vertically and centers horizontally.
    let vfFilter = 'crop=min(ow\\,ih*9/16):ih';
    if (cropVal) {
        console.log('[FFmpeg] Detected border crop:', cropVal);
        vfFilter = `${cropVal},crop=min(ow\\,ih*9/16):ih`;
    } else {
        console.log('[FFmpeg] No borders detected, using default crop.');
    }
    
    onProgress({ message: 'Cropping and Encoding...', percent: 0, startedAt: Date.now() });
    
    return new Promise((resolve, reject) => {
        const args = [
            '-y', '-i', input,
            '-vf', vfFilter,
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '28',
            '-c:a', 'copy',
            '-progress', 'pipe:1',
            output
        ];
        
        const proc = spawn('ffmpeg', args);
        let stderr = '';
        let stdoutBuf = '';
        
        let currentSpeed = '1.0x';
        
        proc.stdout.on('data', data => {
            stdoutBuf += data.toString();
            const lines = stdoutBuf.split('\n');
            stdoutBuf = lines.pop(); // keep the last incomplete line in buffer
            
            let outTimeUs = null;
            let progressState = null;
            
            for (const line of lines) {
                const [k, ...vParts] = line.split('=');
                const v = vParts.join('=');
                
                if (k === 'speed') currentSpeed = v.trim();
                if (k === 'out_time_us') outTimeUs = parseInt(v, 10);
                if (k === 'progress') progressState = v.trim();
            }
            
            if (outTimeUs !== null && durationSec > 0) {
                let currentSec = outTimeUs / 1000000;
                let pct = Math.round((currentSec / durationSec) * 100);
                if (pct > 100) pct = 100;
                
                onProgress({ message: 'FFmpeg processing: ' + pct + '% • ' + currentSpeed, percent: pct, startedAt: Date.now() });
            }
            
            if (progressState === 'end') {
                onProgress({ message: 'FFmpeg processing: 100% • Finished', percent: 100, startedAt: Date.now() });
            }
        });

        proc.stderr.on('data', data => {
            stderr += data.toString();
        });
        
        proc.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error('FFmpeg failed with code ' + code + ': ' + stderr.slice(-1000)));
        });
    });
};

export const processVideoDownload = async (songId, ytId, onProgress = () => {}) => {
    let internalOnProgress = (data) => {
        global.activeVideoDownloads[ytId] = { ...data, ytId, songId };
        onProgress(data);
    };
    global.activeVideoDownloads[ytId] = { message: 'Initializing...', percent: 0, startedAt: Date.now(), ytId, songId };

    console.log("start processing");

    // Check video Cloudinary credits before proceeding
    const creditCheck = await isVideoDownloadBlocked();
    if (creditCheck.blocked) {
        console.log(`[Video Download] BLOCKED: ${creditCheck.reason}`);
        logVideoDownload(
            'Unknown', ytId, songId, 'BLOCKED',
            creditCheck.reason, 'individual'
        );
        return;
    }

    const { command, prefix, env } = getYtDlpRunner();
    const downloadDir = path.resolve(process.cwd(), "downloads");
    if (!fs.existsSync(downloadDir))
        fs.mkdirSync(downloadDir, { recursive: true });

    console.log("created path");

    const jobId = Math.random().toString(36).slice(2, 9);
    const filePrefix = `vid_${ytId}_${jobId}`;
    const rawVideoPath = path.join(downloadDir, `${filePrefix}_raw.mp4`);

    let cookieFile = null;
    try {
        console.log("loading cookie");
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

        // Run FFmpeg to crop
        const processedVideoPath = path.join(downloadDir, `${filePrefix}_cropped.mp4`);
        console.log(`[Video Download] Cropping video for ${ytId}...`);
        
        // Try to get duration from musicModel
        const songDoc = await musicModel.findById(songId);
        const durationSec = songDoc ? (songDoc.duration || 0) : 0;
        
        internalOnProgress({ message: 'Starting video crop...', percent: 0, startedAt: Date.now() });
        await runFfmpeg(rawVideoPath, processedVideoPath, durationSec, onProgress);
        
        internalOnProgress({ message: 'Uploading to Cloudinary...', percent: 100, startedAt: Date.now() });

        // 3. Upload to Cloudinary using _VIDEO credentials
        console.log(`[Video Download] Uploading to Cloudinary...`);
        
        // Re-assign rawVideoPath so the rest of the code uploads the cropped version
        const uploadPath = processedVideoPath;
        
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME_VIDEO;
        const apiKey = process.env.CLOUDINARY_API_KEY_VIDEO;
        const apiSecret = process.env.CLOUDINARY_API_SECRET_VIDEO;

        const uploadResult = await cloudinary.uploader.upload(
            uploadPath,
            {
                resource_type: "video",
                folder: "musicApp/backgrounds",
                cloud_name: cloudName,
                api_key: apiKey,
                api_secret: apiSecret
            }
        );

        const videoUrl = uploadResult.secure_url;

        // 4. Save to DB
        await musicModel.findByIdAndUpdate(songId, { videoUrl });
        logVideoDownload(
            'Video', ytId, songId, 'SUCCESS',
            `Uploaded to Cloudinary: ${videoUrl}`, 'individual'
        );
        console.log(
            `[Video Download] Successfully updated videoUrl for song ${songId}`
        );
    } catch (err) {
        console.error(
            `[Video Download] Error processing video for ${ytId}:`,
            err
        );
        logVideoDownload(
            'Video', ytId, songId, 'ERROR',
            err.message || 'Unknown error', 'individual'
        );
    } finally {
        delete global.activeVideoDownloads[ytId];
        if (cookieFile && fs.existsSync(cookieFile)) {
            try {
                fs.unlinkSync(cookieFile);
            } catch (e) {}
        }
        try {
            if (fs.existsSync(rawVideoPath)) fs.unlinkSync(rawVideoPath);
            const processed = path.join(downloadDir, `${filePrefix}_cropped.mp4`);
            if (fs.existsSync(processed)) fs.unlinkSync(processed);
        } catch (e) {}

        // clean up any other files yt-dlp might have left (like .part)
        try {
            const currentFiles = fs.readdirSync(downloadDir);
            currentFiles.forEach(f => {
                if (f.startsWith(filePrefix))
                    fs.unlinkSync(path.join(downloadDir, f));
            });
        } catch (e) {}
    }
};
