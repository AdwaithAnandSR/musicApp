import "dotenv/config";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import mongoose from "mongoose";
import musicModel from "../models/musics.js";
import { v2 as cloudinary } from "cloudinary";
import { fileURLToPath } from "url";
import { createRequestLog, updateRequestLog } from "../utils/requestLogger.js";
import AppDetail from "../models/appDetails.js";

const __filename = fileURLToPath(import.meta.url);

const INITIAL_CHANNEL_LIMIT = 10;
const downloadDir = path.resolve(process.cwd(), "downloads");

if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const getYtDlpRunner = () => {
    const candidatePaths = [
        path.resolve(process.cwd(), "bin", "yt-dlp"),
        path.resolve(process.cwd(), "server", "bin", "yt-dlp")
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
            if (code === 0) resolve(stdout);
            else
                reject(
                    new Error(
                        `Command '${command} ${args.join(" ")}' failed with code ${code}:\n${stderr}`
                    )
                );
        });
        proc.on("error", err => reject(err));
    });
};

const logHistory = async (title, ytId, status, details = "") => {
    try {
        const doc = await AppDetail.findOne({ key: "download_history" });
        let history = doc ? doc.data : [];
        history.unshift({
            title,
            ytId,
            status,
            details,
            timestamp: new Date().toISOString()
        });
        if (history.length > 50) history = history.slice(0, 50);
        await AppDetail.findOneAndUpdate(
            { key: "download_history" },
            { data: history },
            { upsert: true }
        );
    } catch (err) {
        console.error("Failed to write to history file:", err.message);
    }
};

const uploadToCloudinary = async (filePath, resourceType, folder) => {
    const result = await cloudinary.uploader.upload(filePath, {
        resource_type: resourceType,
        folder
    });
    return result.secure_url;
};

const fetchVideoMetadata = async (ytId, cookieFile) => {
    const { command, prefix } = getYtDlpRunner();
    const args = [...prefix, "-j", "--no-playlist", "--js-runtimes", "node"];
    if (cookieFile) args.push("--cookies", cookieFile);
    args.push(`https://www.youtube.com/watch?v=${ytId}`);
    const out = await runCommand(command, args);
    return JSON.parse(out.trim());
};

const downloadAndSaveVideo = async (ytId, videoData, reqId, cookieFile) => {
    const title = videoData.title || `Video ${ytId}`;
    const duration = videoData.duration || 0;
    const uploader =
        videoData.uploader ||
        videoData.channel ||
        videoData.artist ||
        "Unknown";

    if (mongoose.connection.readyState === 1) {
        const existing = await musicModel.findOne({
            $or: [{ ytId }, { title }]
        });
        if (existing) {
            console.log(
                `[SKIPPED] Song already exists in database: "${title}" (${ytId})`
            );
            logHistory(title, ytId, "SKIPPED", "Already exists in database");
            if (reqId) updateRequestLog(reqId, "SKIPPED");
            return "SKIPPED";
        }
    }

    console.log(`[DOWNLOADING] Audio & thumbnail for "${title}" (${ytId})...`);
    const { command, prefix } = getYtDlpRunner();
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
        path.join(downloadDir, `${ytId}.%(ext)s`)
    ];
    if (cookieFile) dlArgs.push("--cookies", cookieFile);
    dlArgs.push(`https://www.youtube.com/watch?v=${ytId}`);
    await runCommand(command, dlArgs);

    const files = fs.readdirSync(downloadDir);
    const audioFile = files.find(f => f.startsWith(ytId) && f.endsWith(".mp3"));
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

    if (!audioFile)
        throw new Error(`Audio file not found for ${ytId} after download`);

    let audioUrl = null,
        coverUrl = null;
    if (
        process.env.CLOUDINARY_URL ||
        process.env.CLOUDINARY_CLOUD_NAME ||
        process.env.CLOUDINARY_CLOUD_NAME_1
    ) {
        console.log(`[UPLOADING] Uploading to Cloudinary...`);
        audioUrl = await uploadToCloudinary(
            path.join(downloadDir, audioFile),
            "video",
            "musicApp/songs"
        );
        if (coverFile)
            coverUrl = await uploadToCloudinary(
                path.join(downloadDir, coverFile),
                "image",
                "musicApp/covers"
            );
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
    logHistory(title, ytId, "SUCCESS", "Downloaded and saved");
    if (reqId) updateRequestLog(reqId, "SUCCESS");

    fs.readdirSync(downloadDir).forEach(f => {
        if (f.startsWith(ytId)) fs.unlinkSync(path.join(downloadDir, f));
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
        console.log("Connected to MongoDB");
    } catch (err) {
        console.error("MongoDB connection error:", err);
    }
};

export const updateChannels = async () => {
    const reqId = createRequestLog("Channel Worker Sync", 0, 0, "worker");

    let syncStatus = {
        isSyncing: true,
        currentChannel: null,
        totalSongs: 0,
        currentSongIndex: 0,
        currentSongTitle: "",
        successCount: 0,
        skippedCount: 0,
        errorCount: 0,
        message: "Initializing..."
    };
    const updateSyncStatus = async updates => {
        syncStatus = { ...syncStatus, ...updates };
        await AppDetail.findOneAndUpdate(
            { key: "channel_sync_status" },
            { data: syncStatus },
            { upsert: true }
        ).catch(() => {});
    };
    await updateSyncStatus({});

    let cookieFile = null;
    try {
        const cookieDoc = await AppDetail.findOne({ key: "youtube_cookies" });
        if (cookieDoc && cookieDoc.data) {
            
            cookieFile = path.resolve(
                process.cwd(),
                `cookies-${Date.now()}.txt`
            );
            fs.writeFileSync(cookieFile, cookieDoc.data, { mode: 0o600 });
            console.log("Loaded saved YouTube cookies from database.");
        } else console.log("No Loaded saved cookies found.");
    } catch (e) {
        console.error("Error loading cookies:", e.message);
    }

    let channels = [];
    try {
        const doc = await AppDetail.findOne({ key: "channel_config" });
        if (!doc || !doc.data || doc.data.length === 0) {
            const seedFile = path.resolve(process.cwd(), "channel.json");
            if (fs.existsSync(seedFile)) {
                console.log("Seeding channel_config from channel.json...");
                channels = JSON.parse(fs.readFileSync(seedFile, "utf-8"));
                await AppDetail.findOneAndUpdate(
                    { key: "channel_config" },
                    { data: channels },
                    { upsert: true }
                );
            } else {
                console.log(
                    "No channel config found in DB or seed file. Exiting."
                );
                return;
            }
        } else {
            channels = doc.data;
        }
    } catch (e) {
        console.error("Error reading channel config:", e);
        return;
    }

    const { command, prefix } = getYtDlpRunner();

    for (let i = 0; i < channels.length; i++) {
        const channelEntry = channels[i];
        let channelUrl = channelEntry.channel;
        const lastSongId = channelEntry.lastSongId;

        // Ensure we only parse the 'videos' tab to avoid fetching Shorts/Live tabs
        if (!channelUrl.endsWith("/videos") && channelUrl.includes("@")) {
            channelUrl = channelUrl.replace(/\/?$/, "") + "/videos";
        }
        const lastSongTimestamp = channelEntry.lastSongTimestamp;

        console.log(`\n==========================================`);
        console.log(`Processing channel: ${channelUrl}`);
        await updateSyncStatus({
            currentChannel: channelUrl.replace("https://www.youtube.com/", ""),
            message: "Fetching channel feed...",
            totalSongs: 0,
            currentSongIndex: 0,
            successCount: 0,
            skippedCount: 0,
            errorCount: 0
        });

        console.log("Fetching channel playlist...");
        let listOutput = "";
        try {
            const argsList = [
                ...prefix,
                "-j",
                "--flat-playlist",
                "--js-runtimes",
                "node"
            ];
            if (cookieFile) argsList.push("--cookies", cookieFile);
            argsList.push(channelUrl);
            listOutput = await runCommand(command, argsList);
        } catch (e) {
            console.error(
                `Failed to fetch channel playlist for ${channelUrl}:`,
                e.message
            );
            continue;
        }

        const videos = listOutput
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

        console.log(`Found ${videos.length} videos from channel feed.`);

        const isInitialSync = !lastSongId && !lastSongTimestamp;
        let stopProcessing = false;
        const newVideoRange = [];
        let downloadCount = 0;

        for (let j = 0; j < videos.length; j++) {
            if (stopProcessing) break;

            const ytId = videos[j].id;

            if (!isInitialSync && ytId === lastSongId) {
                console.log(
                    `Found lastSongId (${lastSongId}). Boundary reached.`
                );
                break;
            }

            console.log(`Fetching metadata for ${ytId}...`);
            let videoData;
            try {
                videoData = await fetchVideoMetadata(ytId, cookieFile);
            } catch (e) {
                console.error(
                    `Failed to fetch metadata for ${ytId}:`,
                    e.message
                );
                continue; // Can't determine timestamp, skip this video in iteration
            }

            let currentIsoTimestamp = null;
            if (videoData.timestamp) {
                currentIsoTimestamp = new Date(
                    videoData.timestamp * 1000
                ).toISOString();
            } else if (videoData.upload_date) {
                const y = videoData.upload_date.substring(0, 4);
                const m = videoData.upload_date.substring(4, 6);
                const d = videoData.upload_date.substring(6, 8);
                currentIsoTimestamp = new Date(
                    `${y}-${m}-${d}T00:00:00.000Z`
                ).toISOString();
            } else {
                currentIsoTimestamp = new Date().toISOString();
            }

            if (
                !isInitialSync &&
                lastSongTimestamp &&
                currentIsoTimestamp <= lastSongTimestamp
            ) {
                console.log(
                    `Timestamp ${currentIsoTimestamp} is older or equal to lastSongTimestamp ${lastSongTimestamp}. Boundary reached.`
                );
                break;
            }

            newVideoRange.push({ ytId, videoData, currentIsoTimestamp });

            if (
                isInitialSync &&
                newVideoRange.length >= INITIAL_CHANNEL_LIMIT
            ) {
                console.log(
                    `Initial sync limit reached (${INITIAL_CHANNEL_LIMIT}). Stopping range search.`
                );
                break;
            }
        }

        if (newVideoRange.length === 0) {
            console.log("No new videos to process for this channel.");
            continue;
        }

        await updateSyncStatus({
            totalSongs: newVideoRange.length,
            message: "Processing videos..."
        });

        // Checkpoint candidate is the NEWEST video (first in our array because we fetched newest -> oldest)
        const checkpointCandidate = newVideoRange[0];

        // Process the new video range (newest -> oldest, matching array order)
        for (const item of newVideoRange) {
            const ytId = item.ytId;
            const videoData = item.videoData;
            const duration = videoData.duration || 0;
            const title = videoData.title || `Video ${ytId}`;

            console.log(`\n-- Inspecting: "${title}" [${ytId}]`);
            await updateSyncStatus({
                currentSongIndex: syncStatus.currentSongIndex + 1,
                currentSongTitle: title,
                message: "Downloading..."
            });

            // Duration Filter
            if (duration < 120 || duration >= 300) {
                console.log(
                    `[SKIPPED] Duration outside allowed range:\n"${title}" (${duration} seconds)`
                );
                logHistory(
                    title,
                    ytId,
                    "SKIPPED",
                    `Duration outside allowed range (${duration} seconds)`
                );
                if (reqId) updateRequestLog(reqId, "SKIPPED");
                await updateSyncStatus({
                    skippedCount: syncStatus.skippedCount + 1
                });
                continue;
            }

            // Attempt download up to 3 times
            let success = false;
            let dlStatus = null;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    dlStatus = await downloadAndSaveVideo(
                        ytId,
                        videoData,
                        reqId,
                        cookieFile
                    );
                    success = true;
                    break;
                } catch (e) {
                    console.error(
                        `[ERROR] Attempt ${attempt}/3 failed for ${ytId}:`,
                        e.message
                    );

                    // Cleanup any partial files for this ytId
                    try {
                        const currentFiles = fs.readdirSync(downloadDir);
                        currentFiles.forEach(f => {
                            if (f.startsWith(ytId))
                                fs.unlinkSync(path.join(downloadDir, f));
                        });
                    } catch (cleanupErr) {}

                    if (attempt < 3) {
                        console.log(`Waiting before retry...`);
                        await sleep(3000);
                    }
                }
            }

            if (!success) {
                console.log(
                    `[FAILED] Skipping "${title}" [${ytId}] permanently for this run after 3 failed attempts.`
                );
                logHistory(title, ytId, "ERROR", "Failed after 3 attempts");
                if (reqId) updateRequestLog(reqId, "ERROR");
                await updateSyncStatus({
                    errorCount: syncStatus.errorCount + 1
                });
            } else if (dlStatus === "SKIPPED") {
                await updateSyncStatus({
                    skippedCount: syncStatus.skippedCount + 1
                });
            } else if (dlStatus === "SUCCESS") {
                downloadCount++;
                await updateSyncStatus({
                    successCount: syncStatus.successCount + 1
                });
            }
        }

        // After processing the complete discovered range, safely update the checkpoint
        console.log(
            `\nUpdating checkpoint for ${channelUrl} to ID: ${checkpointCandidate.ytId}`
        );
        channels[i].lastSongId = checkpointCandidate.ytId;
        channels[i].lastSongTimestamp = checkpointCandidate.currentIsoTimestamp;
        channels[i].lastSyncCount = downloadCount;

        await AppDetail.findOneAndUpdate(
            { key: "channel_config" },
            { data: channels },
            { upsert: true }
        );
    }

    await updateSyncStatus({ isSyncing: false, message: "Sync complete." });
    if (cookieFile && fs.existsSync(cookieFile)) {
        try {
            fs.unlinkSync(cookieFile);
        } catch (e) {}
    }
};

const main = async () => {
    if (process.argv[1] === __filename) {
        await connectDB();
        await updateChannels();
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
            console.log("Disconnected from MongoDB.");
        }
    }
};

main();
