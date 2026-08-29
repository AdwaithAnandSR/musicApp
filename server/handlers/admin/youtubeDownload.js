import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import musicModel from "../../models/musics.js";

// Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

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
        
        // Add to beginning
        history.unshift(entry);
        
        // Keep only recent 30
        if (history.length > 30) {
            history = history.slice(0, 30);
        }
        
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    } catch (err) {
        console.error("Failed to write to history file:", err);
    }
};

const runCommand = (command, args) => {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args);
        let stdout = "";
        let stderr = "";
        
        proc.stdout.on("data", data => stdout += data.toString());
        proc.stderr.on("data", data => stderr += data.toString());
        
        proc.on("close", code => {
            if (code === 0) resolve(stdout);
            else reject(new Error(`Command failed with code ${code}: ${stderr}`));
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
        console.error("Cloudinary upload error:", err);
        throw err;
    }
};

const processBackgroundDownload = async (url, skip, limit, cookieFile) => {
    const ytdlpPath = path.resolve(process.cwd(), "bin", "yt-dlp");
    const downloadDir = path.resolve(process.cwd(), "downloads");
    if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
    }

    const playlistStart = (parseInt(skip) || 0) + 1;
    const playlistEnd = (parseInt(skip) || 0) + (parseInt(limit) || 10);

    try {
        console.log(`Fetching playlist info for: ${url}`);
        const argsList = [
            "-j", "--flat-playlist", 
            "--playlist-start", playlistStart.toString(),
            "--playlist-end", playlistEnd.toString(),
            "--js-runtimes", "nodejs:node"
        ];
        if (cookieFile) argsList.push("--cookies", cookieFile);
        argsList.push(url);

        const listOutput = await runCommand("python3", [ytdlpPath, ...argsList]);
        const videos = listOutput.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));

        for (const video of videos) {
            const ytId = video.id;
            const title = video.title;
            const duration = video.duration || 0;
            const uploader = video.uploader || video.channel || "Unknown";

            try {
                // 1. Check if song already exists
                const existing = await musicModel.findOne({
                    $or: [{ ytId }, { title }]
                });

                if (existing) {
                    console.log(`Skipping existing song: ${title} (${ytId})`);
                    logHistory(title, ytId, "SKIPPED", "Already exists in database");
                    continue;
                }

                console.log(`Downloading: ${title} (${ytId})`);

                // 2. Download video and thumbnail locally first
                const dlArgs = [
                    "--extract-audio", "--audio-format", "mp3", "--audio-quality", "0",
                    "--write-thumbnail",
                    "--js-runtimes", "nodejs:node",
                    "-o", path.join(downloadDir, `${ytId}.%(ext)s`),
                    `https://www.youtube.com/watch?v=${ytId}`
                ];
                if (cookieFile) dlArgs.push("--cookies", cookieFile);

                await runCommand("python3", [ytdlpPath, ...dlArgs]);

                // 3. Find the downloaded files
                const files = fs.readdirSync(downloadDir);
                const audioFile = files.find(f => f.startsWith(ytId) && f.endsWith('.mp3'));
                const coverFile = files.find(f => f.startsWith(ytId) && !f.endsWith('.mp3') && !f.endsWith('.webm') && !f.endsWith('.m4a'));

                if (!audioFile) {
                    console.error(`Audio file not found for ${ytId} after download.`);
                    logHistory(title, ytId, "ERROR", "Audio file not found after download");
                    continue;
                }

                // 4. Upload to Cloudinary
                console.log(`Uploading ${title} to Cloudinary...`);
                const audioPath = path.join(downloadDir, audioFile);
                const audioUrl = await uploadToCloudinary(audioPath, "video", "musicApp/songs"); // Cloudinary uses 'video' for audio
                
                let coverUrl = null;
                let coverPath = null;
                if (coverFile) {
                    coverPath = path.join(downloadDir, coverFile);
                    coverUrl = await uploadToCloudinary(coverPath, "image", "musicApp/covers");
                }

                // 5. Store to Database
                await musicModel.create({
                    title,
                    url: audioUrl,
                    cover: coverUrl,
                    duration,
                    artist: uploader,
                    ytId,
                    stableRandom: Math.random()
                });
                console.log(`Successfully added to DB: ${title}`);
                logHistory(title, ytId, "SUCCESS", "Uploaded to Cloudinary and saved to DB");

            } catch (videoError) {
                console.error(`Error processing video ${title} (${ytId}):`, videoError);
                logHistory(title, ytId, "ERROR", videoError.message || "Unknown error occurred");
            } finally {
                // 6. Delete ALL local files starting with ytId (including leftovers like .webm)
                try {
                    const currentFiles = fs.readdirSync(downloadDir);
                    currentFiles.forEach(f => {
                        if (f.startsWith(ytId)) {
                            fs.unlinkSync(path.join(downloadDir, f));
                        }
                    });
                } catch (cleanupErr) {
                    console.error(`Failed to cleanup temp files for ${ytId}:`, cleanupErr);
                }
            }
        }
        
    } catch (err) {
        console.error("Error during background download process:", err);
    } finally {
        // Cleanup cookie file
        if (cookieFile && fs.existsSync(cookieFile)) {
            fs.unlinkSync(cookieFile);
        }
    }
};

export const youtubeDownload = async (req, res) => {
    try {
        const { url, skip, limit, cookies } = req.body;
        
        console.log("=== YouTube Download Request ===");
        console.log("URL:", url);
        console.log("Skip:", skip);
        console.log("Limit:", limit);
        
        let cookieFile = null;
        if (cookies) {
            cookieFile = path.resolve(process.cwd(), `cookies-${Date.now()}.txt`);
            let netscapeCookies = "# Netscape HTTP Cookie File\n";
            cookies.split(';').forEach(cookie => {
                const [name, ...rest] = cookie.trim().split('=');
                if (name) {
                    const value = rest.join('=');
                    netscapeCookies += `.youtube.com\tTRUE\t/\tTRUE\t2147483647\t${name}\t${value}\n`;
                }
            });
            fs.writeFileSync(cookieFile, netscapeCookies);
        }
        
        // Start background process
        processBackgroundDownload(url, skip, limit, cookieFile);

        return res.status(200).json({ 
            success: true, 
            message: "Download process started in the background." 
        });
    } catch (error) {
        console.error("Error in youtubeDownload:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal server error" 
        });
    }
};
