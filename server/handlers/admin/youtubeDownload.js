import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import cloudinary from "../../config/cloudinary.js";
import musicModel from "../../models/musics.js";
import { createRequestLog, updateRequestLog, setRequestCurrentItem, markRequestDone } from "../../utils/requestLogger.js";
import AppDetail from "../../models/appDetails.js";

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



const createCookieFile = cookiesInput => {
    let raw = cookiesInput;
    if (!raw && process.env.YOUTUBE_COOKIES) {
        raw = process.env.YOUTUBE_COOKIES;
    }
    if (!raw) return null;

    if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            try {
                raw = JSON.parse(trimmed);
            } catch {
                // keep as string
            }
        }
    }

    let netscapeContent = "# Netscape HTTP Cookie File\n";

    if (typeof raw === "object" && raw !== null) {
        for (const [key, val] of Object.entries(raw)) {
            const cookieValue =
                typeof val === "object" && val !== null && "value" in val
                    ? val.value
                    : val;
            if (key && cookieValue !== undefined && cookieValue !== null) {
                netscapeContent += `.youtube.com\tTRUE\t/\tTRUE\t2147483647\t${key}\t${cookieValue}\n`;
            }
        }
    } else if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (trimmed.startsWith("# Netscape") || trimmed.includes("\t")) {
            netscapeContent = trimmed.endsWith("\n") ? trimmed : trimmed + "\n";
        } else {
            trimmed.split(";").forEach(cookie => {
                const [name, ...rest] = cookie.trim().split("=");
                if (name && rest.length > 0) {
                    const value = rest.join("=");
                    netscapeContent += `.youtube.com\tTRUE\t/\tTRUE\t2147483647\t${name}\t${value}\n`;
                }
            });
        }
    }

    const cookiePath = path.resolve(
        process.cwd(),
        `cookies-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.txt`
    );
    fs.writeFileSync(cookiePath, netscapeContent, { mode: 0o600 });
    return cookiePath;
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

const runCommand = (command, args, ignoreOutput = false) => {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args);
        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", data => {
            if (!ignoreOutput) stdout += data.toString();
        });
        proc.stderr.on("data", data => {
            if (!ignoreOutput) stderr += data.toString();
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

export const processBackgroundDownload = async (url, skip, limit, cookieFile, reqId) => {
    const { command, prefix } = getYtDlpRunner();
    const downloadDir = path.resolve(process.cwd(), "downloads");
    if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
    }



    try {
        const videoId = extractVideoId(url);
        let videos = [];

        if (videoId) {
            const directVideoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            console.log(
                `[YouTube Download] Direct video ID detected: ${videoId}. Using single video URL: ${directVideoUrl}`
            );

            // Quick duplicate check before running yt-dlp
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
                if (reqId) await updateRequestLog(reqId, "SKIPPED");
                return;
            }

            console.log(
                `[YouTube Download] Fetching single video metadata for: ${directVideoUrl}...`
            );
            const argsList = [
                ...prefix,
                "-j",
                "--no-playlist",
                "--js-runtimes",
                "node"
            ];
            // Cookies are deliberately not passed to avoid skipping the android client, which leads to 403s.
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
            // Actual playlist without a direct video ID
            const parsedSkip = parseInt(skip, 10) || 0;
            const parsedLimit = parseInt(limit, 10) || 1;
            const playlistStart = parsedSkip + 1;
            const playlistEnd = parsedSkip + parsedLimit;

            console.log(
                `[YouTube Download] Fetching playlist info for: ${url} (items ${playlistStart} to ${playlistEnd})...`
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
            // Cookies are deliberately not passed to avoid skipping the android client, which leads to 403s.
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

        console.log(
            `[YouTube Download] Found ${videos.length} video(s) to process.`
        );

        if (videos.length === 0) {
            console.log(
                "[YouTube Download] No videos found matching the criteria or playlist range."
            );
        }

        for (const video of videos) {
            const ytId = video.id;
            const title = video.title || `Video ${ytId}`;
            const duration = video.duration || 0;
            const uploader = video.uploader || video.channel || "Unknown";

            console.log(`------------------------------------------`);
            console.log(`Processing: "${title}" [${ytId}]`);
            if (reqId) await setRequestCurrentItem(reqId, title);

            try {
                // 1. Duplicate check by ytId or title
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
                    if (reqId) await updateRequestLog(reqId, "SKIPPED");
                    continue;
                }

                console.log(
                    `[DOWNLOADING] Audio & thumbnail for "${title}" (${ytId})...`
                );

                try {
                    const currentFiles = fs.readdirSync(downloadDir);
                    currentFiles.forEach(f => {
                        if (f.startsWith(ytId)) {
                            fs.unlinkSync(path.join(downloadDir, f));
                        }
                    });
                } catch (cleanupErr) {}

                // 2. Download audio (mp3) and thumbnail
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
                // Cookies are deliberately not passed to avoid skipping the android client

                await runCommand(command, dlArgs, true);

                // 3. Find the downloaded files
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

                // 4. Upload to Cloudinary
                console.log(
                    `[UPLOADING] Uploading audio to Cloudinary (musicApp/songs)...`
                );
                const audioPath = path.join(downloadDir, audioFile);
                const audioUrl = await uploadToCloudinary(
                    audioPath,
                    "video",
                    "musicApp/songs"
                );

                let coverUrl = null;
                if (coverFile) {
                    console.log(
                        `[UPLOADING] Uploading cover image to Cloudinary (musicApp/covers)...`
                    );
                    const coverPath = path.join(downloadDir, coverFile);
                    coverUrl = await uploadToCloudinary(
                        coverPath,
                        "image",
                        "musicApp/covers"
                    );
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
                logHistory(
                    title,
                    ytId,
                    "SUCCESS",
                    "Uploaded to Cloudinary and saved to DB"
                );
                if (reqId) await updateRequestLog(reqId, "SUCCESS");
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
                if (reqId) await updateRequestLog(reqId, "ERROR");
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
                    console.error(
                        `Failed to cleanup temp files for ${ytId}:`,
                        cleanupErr.message
                    );
                }
            }
        }
    } catch (err) {
        console.error(
            "[YouTube Download] Error during background download process:",
            err
        );
    } finally {
        if (reqId) await markRequestDone(reqId);
        // Cleanup cookie file
        if (cookieFile && fs.existsSync(cookieFile)) {
            try {
                fs.unlinkSync(cookieFile);
            } catch (e) {
                console.error("Failed to delete temp cookie file:", e.message);
            }
        }
    }
};

export const youtubeDownload = async (req, res) => {
    try {
        const { url, skip, limit, cookies } = req.body;

        console.log("=== YouTube Download Request (Render Server) ===");
        console.log("URL:", url);
        console.log("Skip:", skip);
        console.log("Limit:", limit);
        console.log("Cookies present:", !!cookies);

        // 1. Validation
        if (!url || typeof url !== "string" || !url.trim()) {
            return res.status(400).json({
                success: false,
                message: "A valid YouTube URL is required."
            });
        }

        const trimmedUrl = url.trim();
        const parsedSkip = parseInt(skip, 10);
        const parsedLimit = parseInt(limit, 10);
        const safeSkip = !isNaN(parsedSkip) && parsedSkip >= 0 ? parsedSkip : 0;
        const safeLimit =
            !isNaN(parsedLimit) && parsedLimit >= 1 ? parsedLimit : 1;

        // 2. Cookie file creation (if cookies provided)
        let cookieFile = null;
        try {
            cookieFile = createCookieFile(cookies);
            if (cookieFile && fs.existsSync(cookieFile)) {
                const netscapeContent = fs.readFileSync(cookieFile, 'utf8');
                AppDetail.findOneAndUpdate({ key: "youtube_cookies" }, { data: netscapeContent }, { upsert: true }).catch(()=>{});
                console.log("Saved new cookies to database for future background tasks.");
            }
        } catch (cookieErr) {
            console.error("Failed to create cookie file:", cookieErr.message);
        }

        // 3. Start background download process on Render server
        const reqId = await createRequestLog(trimmedUrl, safeLimit, safeSkip, "single");
        processBackgroundDownload(trimmedUrl, safeSkip, safeLimit, cookieFile, reqId);

        // 4. Immediate response
        return res.status(200).json({
            success: true,
            message:
                "Download process started in the background on Render server."
        });
    } catch (error) {
        console.error("Error in youtubeDownload:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export default youtubeDownload;
