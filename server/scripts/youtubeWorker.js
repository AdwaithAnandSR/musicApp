import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import musicModel from "../models/musics.js";

const HISTORY_FILE = path.resolve(process.cwd(), "download_history.json");

const logHistory = (title, ytId, status, details = "") => {
    try {
        let history = [];
        if (fs.existsSync(HISTORY_FILE)) {
            const data = fs.readFileSync(HISTORY_FILE, "utf-8");
            if (data) {
                history = JSON.parse(data);
            }
        }

        const entry = {
            title,
            ytId,
            status,
            details,
            timestamp: new Date().toISOString()
        };

        history.unshift(entry);
        if (history.length > 30) {
            history = history.slice(0, 30);
        }

        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    } catch (err) {
        console.error("Failed to write to history file:", err.message);
    }
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
                reject(new Error(`Command '${command} ${args.join(" ")}' failed with code ${code}:\n${stderr}`));
            }
        });

        proc.on("error", err => reject(err));
    });
};

const connectDB = async () => {
    let uri = process.env.MONGODB_URI;
    if (!uri) {
        const pass = process.env.MONGODB_PASS;
        if (!pass) {
            throw new Error("Missing MongoDB connection info: neither MONGODB_URI nor MONGODB_PASS is set in secrets/environment.");
        }
        const dbName = process.env.MONGODB_DB_NAME || "vividMusic";
        uri = `mongodb+srv://AdwaithAnandSR:${pass}@cluster0.8os2c.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=Cluster0`;
    }
    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("Connected to MongoDB successfully.");
};

const initCloudinary = () => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error("Missing Cloudinary credentials in secrets: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are required.");
    }

    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
    });
    console.log(`Cloudinary configured successfully for cloud: ${cloudName}`);
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
    const url = process.env.URL || process.argv[2];
    const skip = process.env.SKIP || process.argv[3] || "0";
    const limit = process.env.LIMIT || process.argv[4] || "1";

    if (!url || !url.trim()) {
        console.error("Error: YouTube URL is required.");
        process.exit(1);
    }

    console.log("==========================================");
    console.log(" YouTube Download Worker (GitHub Actions)");
    console.log("==========================================");
    console.log(`Target URL : ${url}`);
    console.log(`Skip       : ${skip}`);
    console.log(`Limit      : ${limit}`);

    // Setup temporary cookie file if secret is provided
    let cookieFile = null;
    const cookiesSecret = process.env.YOUTUBE_COOKIES;
    if (cookiesSecret && cookiesSecret.trim()) {
        cookieFile = path.resolve(process.cwd(), `.cookies-${Date.now()}.txt`);
        const trimmed = cookiesSecret.trim();
        let netscapeContent = "";
        if (trimmed.startsWith("# Netscape") || trimmed.includes("\t")) {
            netscapeContent = trimmed + "\n";
        } else {
            netscapeContent = "# Netscape HTTP Cookie File\n";
            trimmed.split(";").forEach(cookie => {
                const [name, ...rest] = cookie.trim().split("=");
                if (name) {
                    const value = rest.join("=");
                    netscapeContent += `.youtube.com\tTRUE\t/\tTRUE\t2147483647\t${name}\t${value}\n`;
                }
            });
        }
        fs.writeFileSync(cookieFile, netscapeContent, { mode: 0o600 });
        console.log("YouTube cookies configured from secret.");
    } else {
        console.log("No YouTube cookies secret provided; proceeding with standard extractors.");
    }

    const downloadDir = path.resolve(process.cwd(), "downloads");
    if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
    }

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    try {
        // Initialize services
        await connectDB();
        initCloudinary();

        // Calculate playlist range
        const parsedSkip = parseInt(skip, 10) || 0;
        const parsedLimit = parseInt(limit, 10) || 1;
        const playlistStart = parsedSkip + 1;
        const playlistEnd = parsedSkip + parsedLimit;

        console.log(`\nFetching playlist info (items ${playlistStart} to ${playlistEnd})...`);
        const argsList = [
            "-j",
            "--flat-playlist",
            "--playlist-start", playlistStart.toString(),
            "--playlist-end", playlistEnd.toString(),
            "--js-runtimes", "node",
            "--extractor-args", "youtube:client=ANDROID,IOS"
        ];
        if (cookieFile) {
            argsList.push("--cookies", cookieFile);
        }
        argsList.push(url);

        const listOutput = await runCommand("yt-dlp", argsList);
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

        console.log(`Found ${videos.length} video(s) to process.\n`);

        if (videos.length === 0) {
            console.log("No videos found matching the criteria or playlist range.");
        }

        for (const video of videos) {
            const ytId = video.id;
            const title = video.title || `Video ${ytId}`;
            const duration = video.duration || 0;
            const uploader = video.uploader || video.channel || "Unknown";

            console.log(`------------------------------------------`);
            console.log(`Processing: "${title}" [${ytId}]`);

            try {
                // 1. Duplicate check by ytId or title
                const existing = await musicModel.findOne({
                    $or: [{ ytId }, { title }]
                });

                if (existing) {
                    console.log(`[SKIPPED] Song already exists in database: "${title}" (${ytId})`);
                    logHistory(title, ytId, "SKIPPED", "Already exists in database");
                    skippedCount++;
                    continue;
                }

                console.log(`[DOWNLOADING] Audio & thumbnail for "${title}" (${ytId})...`);

                // 2. Download audio (mp3) and thumbnail
                const dlArgs = [
                    "--extract-audio",
                    "--audio-format", "mp3",
                    "--audio-quality", "0",
                    "--write-thumbnail",
                    "--js-runtimes", "node",
                    "--extractor-args", "youtube:client=ANDROID,IOS",
                    "-o", path.join(downloadDir, `${ytId}.%(ext)s`),
                    `https://www.youtube.com/watch?v=${ytId}`
                ];
                if (cookieFile) {
                    dlArgs.push("--cookies", cookieFile);
                }

                await runCommand("yt-dlp", dlArgs);

                // 3. Find the downloaded files
                const files = fs.readdirSync(downloadDir);
                const audioFile = files.find(f => f.startsWith(ytId) && f.endsWith(".mp3"));
                const coverFile = files.find(
                    f => f.startsWith(ytId) &&
                    !f.endsWith(".mp3") &&
                    !f.endsWith(".webm") &&
                    !f.endsWith(".m4a") &&
                    !f.endsWith(".part") &&
                    !f.endsWith(".ytdl") &&
                    !f.endsWith(".temp")
                );

                if (!audioFile) {
                    throw new Error(`Audio file not found for ${ytId} after download`);
                }

                // 4. Upload to Cloudinary
                console.log(`[UPLOADING] Uploading audio to Cloudinary (musicApp/songs)...`);
                const audioPath = path.join(downloadDir, audioFile);
                const audioUrl = await uploadToCloudinary(audioPath, "video", "musicApp/songs");

                let coverUrl = null;
                if (coverFile) {
                    console.log(`[UPLOADING] Uploading cover image to Cloudinary (musicApp/covers)...`);
                    const coverPath = path.join(downloadDir, coverFile);
                    coverUrl = await uploadToCloudinary(coverPath, "image", "musicApp/covers");
                }

                // 5. Save to MongoDB
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

                console.log(`[SUCCESS] Added "${title}" to database!`);
                logHistory(title, ytId, "SUCCESS", "Uploaded to Cloudinary and saved to DB");
                successCount++;

            } catch (videoError) {
                console.error(`[ERROR] Failed processing "${title}" (${ytId}):`, videoError.message);
                logHistory(title, ytId, "ERROR", videoError.message || "Unknown error occurred");
                errorCount++;
            } finally {
                // 6. Clean up temporary files for this video
                try {
                    const currentFiles = fs.readdirSync(downloadDir);
                    currentFiles.forEach(f => {
                        if (f.startsWith(ytId)) {
                            fs.unlinkSync(path.join(downloadDir, f));
                        }
                    });
                } catch (cleanupErr) {
                    console.error(`Failed to cleanup temp files for ${ytId}:`, cleanupErr.message);
                }
            }
        }

        console.log(`\n==========================================`);
        console.log(` Summary:`);
        console.log(` Total Found : ${videos.length}`);
        console.log(` Succeeded   : ${successCount}`);
        console.log(` Skipped     : ${skippedCount}`);
        console.log(` Failed      : ${errorCount}`);
        console.log(`==========================================`);

        if (errorCount > 0 && successCount === 0 && skippedCount === 0) {
            throw new Error(`All ${errorCount} video download(s) failed.`);
        }

    } catch (err) {
        console.error("\nWorker encountered a fatal error:", err);
        process.exitCode = 1;
    } finally {
        // Cleanup cookie file
        if (cookieFile && fs.existsSync(cookieFile)) {
            try {
                fs.unlinkSync(cookieFile);
            } catch (e) {
                console.error("Failed to delete temp cookie file:", e.message);
            }
        }

        // Close MongoDB connection cleanly
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
            console.log("Disconnected from MongoDB.");
        }
    }
};

main();
