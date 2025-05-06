import express from "express";
import multer from "multer";
import * as play from "play-dl";
import { fileTypeFromBuffer } from "file-type";
import axios from "axios";
import { exec } from "child_process";

import musicModel from "../models/musics.js";
import handleDirectUploadUpload from "../handlers/handleDirectUpload.js";

const router = express.Router();
const storage = multer.memoryStorage(); // Use memory storage for quick uploads
const upload = multer({ storage });

const downloadFileAsBuffer = async url => {
    try {
        const response = await axios.get(url, { responseType: "arraybuffer" });
        return Buffer.from(response.data);
    } catch (err) {
        console.error("Error downloading file:", err.message);
        return null;
    }
};

const sanitizeYouTubeURL = url => {
    try {
        url = url
            .trim()
            .replace("m.youtube.com", "www.youtube.com")
            .replace("youtu.be/", "www.youtube.com/watch?v=")
            .split("&")[0]; // remove extra query params

        const parsed = new URL(url);
        const videoId = parsed.searchParams.get("v");
        if (!videoId) return null;
        return `https://www.youtube.com/watch?v=${videoId}`;
    } catch {
        return null;
    }
};

router.post("/saveToCloud", async (req, res) => {
    try {
        let { url } = req.body;
        url = sanitizeYouTubeURL(url);
        if (!url) return;
        const cmd = `../bin/yt/yt-dlp -j "${url}"`;

        // Validate URL (optional step)
        if (
            !url.match(
                /https:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/
            ) &&
            !url.match(/https:\/\/youtu\.be\/([a-zA-Z0-9_-]+)/)
        ) {
            return console.log("Invalid URL");
        }

        console.log(`url: ${url}`);

        exec(cmd, async (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return;
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
                return;
            }

            const info = JSON.parse(stdout);
            const title = info.title;

            const existsSong = await musicModel.findOne({ title });

            console.log(`existsSong: ${existsSong}`);

            if (existsSong)
                return res
                    .status(409)
                    .json({ message: "song already exists!", title });

            const thumbnailUrl = info.thumbnail;
            const audioUrl = info.formats.find(format => format.audio_only); // Look for audio-only formats
            const audioFileUrl = audioUrl ? audioUrl.url : null;

            // Download and save audio file as buffer
            let audioBuffer = null;
            if (audioFileUrl) {
                console.log("audio downloading");
                audioBuffer = await downloadFileAsBuffer(audioFileUrl);
                console.log("audio downloaded");
            }

            // Download and save cover image as buffer
            let coverImageBuffer = null;
            if (thumbnailUrl) {
                console.log("cover downloading");
                coverBuffer = await downloadFileAsBuffer(thumbnailUrl);
                console.log("cover downloaded");
            }
            const audioType = await fileTypeFromBuffer(audioBuffer);
            const coverType = await fileTypeFromBuffer(coverBuffer);

            handleDirectUploadUpload({
                title,
                audioType,
                coverType,
                audioBuffer,
                coverBuffer,
                res
            });
        });
    } catch (e) {
        console.log("error at admin routes", e);
        res.status(501).json({
            message: "internal error",
            e
        });
    }
});

export default router;
