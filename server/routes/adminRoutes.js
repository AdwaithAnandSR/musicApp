import express from "express";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import axios from "axios";
import ytdl from "ytdl-core";

import musicModel from "../models/musics.js";
import streamToBuffer from "../utils/streamToBuffer.js";
import handleDirectUploadUpload from "../handlers/handleDirectUpload.js";

const router = express.Router();
const storage = multer.memoryStorage(); // Use memory storage for quick uploads
const upload = multer({ storage });

const sanitizeYouTubeURL = url => {
    try {
        url = url
            .trim()
            .replace("m.youtube.com", "www.youtube.com")
            .replace("youtu.be/", "www.youtube.com/watch?v=")
            .split("&")[0];

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
        let { cookie, url } = req.body
        url = sanitizeYouTubeURL(url)
        console.log("\nurl: ", url);

        const info = await ytdl.getInfo(url);
        
        const title = info.videoDetails.title
        
        const audioStream = ytdl.downloadFromInfo(info, {
            filter: "audioonly"
        });
        
        const audioBuffer = await streamToBuffer(audioStream)

        const videoId = info.videoDetails.videoId;
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        const coverBuffer = (
            await axios.get(thumbnailUrl, { responseType: "arraybuffer" })
        ).data;

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
    } catch (e) {
        console.log("error at admin routes", e);
        res.status(501).json({ message: "internal error", e });
    }
});

export default router;
