import "dotenv/config";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import cloudinary from "../config/cloudinary.js";
import mongoose from "mongoose";
import musicModel from "../models/musics.js";
import { createRequestLog, updateRequestLog, setRequestCurrentItem, markRequestDone } from "../utils/requestLogger.js";
import AppDetail from "../models/appDetails.js";

const logHistory = async (title, ytId, status, details = "") => {
    try {
        const doc = await AppDetail.findOne({ key: "download_history" });
        let history = doc ? doc.data : [];
        history.unshift({ title, ytId, status, details, timestamp: new Date().toISOString() });
        if (history.length > 50) history = history.slice(0, 50);
        await AppDetail.findOneAndUpdate({ key: "download_history" }, { data: history }, { upsert: true });
    } catch (err) {
        console.error("Failed to write to history file:", err.message);
    }
};

const extractVideoId = inputUrl => {
    try {
        const parsed = new URL(inputUrl);
        const v = parsed.searchParams.get("v");
        if (v) return v;
        if (parsed.hostname.includes("youtu.be")) {
            const pathname = parsed.pathname.replace(/^\/+/, "");
            if (pathname) return pathname.split("/")[0];
        }
    } catch {
        const match =
            inputUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
            inputUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        if (match) return match[1];
    }
    return null;
};

const getYtDlpRunner = () => {
    const currentDir = path.dirname(new URL(import.meta.url).pathname);
    const candidatePaths = [
        path.resolve(process.cwd(), "bin", "yt-dlp"),
        path.resolve(process.cwd(), "server", "bin", "yt-dlp"),
        path.resolve(currentDir, "..", "..", "bin", "yt-dlp"),
        path.resolve(currentDir, "..", "bin", "yt-dlp")
    ];

    for (const binPath of candidatePaths) {
        if (fs.existsSync(binPath)) {
            return { command: "python3", prefix: [binPath] };
        }
    }
    return { command: "yt-dlp", prefix: [] };
};

const runCommand = (command, args) => {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args);
        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", data => {
            stdout += data.toString();
        });
        proc.stderr.on("data", data => {
            stderr += data.toString();
        });

        proc.on("close", code => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(
                    new Error(
                        `Command '${command} ${args.join(" ")}' failed with code ${code}:\n${stderr}`
                    )
                );
            }
        });

        proc.on("error", err => reject(err));
    });
};

const connectDB = async () => {
    const pass = process.env.MONGODB_PASS;
    const dbName = "vividMusic";
    const uri =
        process.env.MONGODB_URI ||
        (pass
            ? `mongodb+srv://AdwaithAnandSR:${pass}@cluster0.8os2c.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=Cluster0`
            : null);

    if (!uri) {
        console.warn("MONGODB_URI or MONGODB_PASS is not set.");
        return;
    }

    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(uri);
        console.log(`Connected to MongoDB: ${mongoose.connection.name}`);
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
    }
};

const initCloudinary = () => {
    if (process.env.CLOUDINARY_URL) {
        cloudinary.config({
            cloudinary_url: process.env.CLOUDINARY_URL,
            secure: true
        });
        return;
    }

    const cloudName =
        process.env.CLOUDINARY_CLOUD_NAME ||
        process.env.CLOUDINARY_CLOUD_NAME_1;
    const apiKey =
        process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY_1;
    const apiSecret =
        process.env.CLOUDINARY_API_SECRET ||
        process.env.CLOUDINARY_API_SECRET_1;

    if (cloudName && apiKey && apiSecret) {
        cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
            secure: true
        });
        console.log(`Cloudinary configured for cloud: ${cloudName}`);
    }
};

const uploadToCloudinary = async (filePath, resourceType, folder) => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: resourceType,
            folder: folder
        });
        return result.secure_url;
    } catch (err) {
        console.error(`Cloudinary upload error for ${filePath}:`, err);
        throw err;
    }
};

const main = async () => {
    const reqId = createRequestLog(process.env.URL || process.argv[2] || "unknown", process.env.LIMIT || process.argv[4] || 1, process.env.SKIP || process.argv[3] || 0, "cli");
    const url = process.env.URL || process.argv[2];
    const skip = process.env.SKIP || process.argv[3] || "0";
    const limit = process.env.LIMIT || process.argv[4] || "1";

    if (!url || !url.trim()) {
        console.error("Error: YouTube URL is required.");
        process.exit(1);
    }

    console.log("==========================================");
    console.log(" YouTube Download Worker");
    console.log("==========================================");
    console.log(`Target URL : ${url}`);
    console.log(`Skip       : ${skip}`);
    console.log(`Limit      : ${limit}`);

    let cookieFile = null;
    const cookiesSecret = process.env.YOUTUBE_COOKIES;
    if (cookiesSecret && cookiesSecret.trim()) {
        cookieFile = path.resolve(process.cwd(), `cookies-${Date.now()}.txt`);
        const trimmed = cookiesSecret.trim();
        let netscapeContent = "";
        if (trimmed.startsWith("# Netscape") || trimmed.includes("\t")) {
            netscapeContent = trimmed.endsWith("\n") ? trimmed : trimmed + "\n";
        } else {
            netscapeContent = "# Netscape HTTP Cookie File\n";
            trimmed.split(";").forEach(cookie => {
                const [name, ...rest] = cookie.trim().split("=");
                if (name && rest.length > 0) {
                    const value = rest.join("=");
                    netscapeContent += `.youtube.com\tTRUE\t/\tTRUE\t2147483647\t${name}\t${value}\n`;
                }
            });
        }
        fs.writeFileSync(cookieFile, netscapeContent, { mode: 0o600 });
        console.log("YouTube cookies configured from environment.");
        
        try {
            await AppDetail.findOneAndUpdate({ key: "youtube_cookies" }, { data: netscapeContent }, { upsert: true });
            console.log("Saved YouTube cookies to database.");
        } catch (e) {
            console.error("Failed to save cookies to DB:", e.message);
        }
    } else {
        try {
            const cookieDoc = await AppDetail.findOne({ key: "youtube_cookies" });
            if (cookieDoc && cookieDoc.data) {
                cookieFile = path.resolve(process.cwd(), `cookies-${Date.now()}.txt`);
                fs.writeFileSync(cookieFile, cookieDoc.data, { mode: 0o600 });
                console.log("Loaded saved YouTube cookies from database.");
            }
        } catch (e) {
            console.error("Error loading cookies from DB:", e.message);
        }
    }

    const downloadDir = path.resolve(process.cwd(), "downloads");
    if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
    }

    const { command, prefix } = getYtDlpRunner();

    try {
        await connectDB();
        initCloudinary();

        const videoId = extractVideoId(url);
        let videos = [];

        if (videoId) {
            const directVideoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            console.log(
                `Direct video ID detected: ${videoId}. Using single video URL: ${directVideoUrl}`
            );

            if (mongoose.connection.readyState === 1) {
                const existing = await musicModel.findOne({ ytId: videoId });
                if (existing) {
                    console.log(
                        `[SKIPPED] Song already exists in database: "${existing.title}" (${videoId})`
                    );
                    logHistory(
                        existing.title,
                        videoId,
                        "SKIPPED",
                        "Already exists in database"
                    );
                    if (reqId) updateRequestLog(reqId, "SKIPPED");
                    return;
                }
            }

            console.log(`Fetching single video metadata for: ${directVideoUrl}...`);
            const argsList = [
                ...prefix,
                "-j",
                "--no-playlist",
                "--js-runtimes",
                "node"
            ];
            if (cookieFile) {
                argsList.push("--cookies", cookieFile);
            }
            argsList.push(directVideoUrl);

            const infoOutput = await runCommand(command, argsList);
            const videoData = JSON.parse(infoOutput.trim());
            videos = [
                {
                    id: videoData.id || videoId,
                    title: videoData.title || `Video ${videoId}`,
                    duration: videoData.duration || 0,
                    uploader:
                        videoData.uploader ||
                        videoData.channel ||
                        videoData.artist ||
                        "Unknown"
                }
            ];
        } else {
            const parsedSkip = parseInt(skip, 10) || 0;
            const parsedLimit = parseInt(limit, 10) || 1;
            const playlistStart = parsedSkip + 1;
            const playlistEnd = parsedSkip + parsedLimit;

            console.log(
                `Fetching playlist info for: ${url} (items ${playlistStart} to ${playlistEnd})...`
            );
            const argsList = [
                ...prefix,
                "-j",
                "--flat-playlist",
                "--playlist-start",
                playlistStart.toString(),
                "--playlist-end",
                playlistEnd.toString(),
                "--js-runtimes",
                "node"
            ];
            if (cookieFile) {
                argsList.push("--cookies", cookieFile);
            }
            argsList.push(url);

            const listOutput = await runCommand(command, argsList);
            videos = listOutput
                .split("\n")
                .map(line => line.trim())
                .filter(line => line.startsWith("{"))
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return null;
                    }
                })
                .filter(Boolean);
        }

        console.log(`Found ${videos.length} video(s) to process.\n`);

        for (const video of videos) {
            const ytId = video.id;
            const title = video.title || `Video ${ytId}`;
            const duration = video.duration || 0;
            const uploader =
                video.uploader || video.channel || video.artist || "Unknown";

            console.log(`------------------------------------------`);
            console.log(`Processing: "${title}" [${ytId}]`);
            if (reqId) setRequestCurrentItem(reqId, title);

            try {
                if (mongoose.connection.readyState === 1) {
                    const existing = await musicModel.findOne({
                        $or: [{ ytId }, { title }]
                    });

                    if (existing) {
                        console.log(
                            `[SKIPPED] Song already exists in database: "${title}" (${ytId})`
                        );
                        logHistory(
                            title,
                            ytId,
                            "SKIPPED",
                            "Already exists in database"
                        );
                        if (reqId) updateRequestLog(reqId, "SKIPPED");
                        continue;
                    }
                }

                console.log(
                    `[DOWNLOADING] Audio & thumbnail for "${title}" (${ytId})...`
                );

                const dlArgs = [
                    ...prefix,
                    "--extract-audio",
                    "--audio-format",
                    "mp3",
                    "--audio-quality",
                    "0",
                    "--write-thumbnail",
                    "--no-playlist",
                    "--js-runtimes",
                    "node",
                    "-o",
                    path.join(downloadDir, `${ytId}.%(ext)s`),
                    `https://www.youtube.com/watch?v=${ytId}`
                ];
                if (cookieFile) {
                    dlArgs.push("--cookies", cookieFile);
                }

                await runCommand(command, dlArgs);

                const files = fs.readdirSync(downloadDir);
                const audioFile = files.find(
                    f => f.startsWith(ytId) && f.endsWith(".mp3")
                );
                const coverFile = files.find(
                    f =>
                        f.startsWith(ytId) &&
                        !f.endsWith(".mp3") &&
                        !f.endsWith(".webm") &&
                        !f.endsWith(".m4a") &&
                        !f.endsWith(".part") &&
                        !f.endsWith(".ytdl") &&
                        !f.endsWith(".temp")
                );

                if (!audioFile) {
                    throw new Error(
                        `Audio file not found for ${ytId} after download`
                    );
                }

                let audioUrl = null;
                let coverUrl = null;

                if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME_1) {
                    console.log(`[UPLOADING] Uploading audio to Cloudinary...`);
                    const audioPath = path.join(downloadDir, audioFile);
                    audioUrl = await uploadToCloudinary(
                        audioPath,
                        "video",
                        "musicApp/songs"
                    );

                    if (coverFile) {
                        console.log(`[UPLOADING] Uploading cover image to Cloudinary...`);
                        const coverPath = path.join(downloadDir, coverFile);
                        coverUrl = await uploadToCloudinary(
                            coverPath,
                            "image",
                            "musicApp/covers"
                        );
                    }
                }

                if (mongoose.connection.readyState === 1) {
                    console.log(`[SAVING] Storing metadata in MongoDB...`);
                    await musicModel.create({
                        title,
                        url: audioUrl,
                        cover: coverUrl,
                        duration,
                        artist: uploader,
                        ytId,
                        stableRandom: Math.random()
                    });
                }

                console.log(`[SUCCESS] Added "${title}"!`);
                logHistory(
                    title,
                    ytId,
                    "SUCCESS",
                    "Downloaded and saved"
                );
                if (reqId) updateRequestLog(reqId, "SUCCESS");
            } catch (videoError) {
                console.error(
                    `[ERROR] Failed processing "${title}" (${ytId}):`,
                    videoError.message
                );
                logHistory(
                    title,
                    ytId,
                    "ERROR",
                    videoError.message || "Unknown error occurred"
                );
                if (reqId) updateRequestLog(reqId, "ERROR");
            } finally {
                try {
                    const currentFiles = fs.readdirSync(downloadDir);
                    currentFiles.forEach(f => {
                        if (f.startsWith(ytId)) {
                            fs.unlinkSync(path.join(downloadDir, f));
                        }
                    });
                } catch (cleanupErr) {
                    console.error(
                        `Failed to cleanup temp files for ${ytId}:`,
                        cleanupErr.message
                    );
                }
            }
        }
    } catch (err) {
        console.error("Worker error:", err);
    } finally {
        if (reqId) markRequestDone(reqId);
        if (cookieFile && fs.existsSync(cookieFile)) {
            try {
                fs.unlinkSync(cookieFile);
            } catch (e) {
                console.error("Failed to delete temp cookie file:", e.message);
            }
        }

        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
            console.log("Disconnected from MongoDB.");
        }
    }
};

main();
