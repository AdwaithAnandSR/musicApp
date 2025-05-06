import express from "express";
import multer from "multer";
import * as play from 'play-dl';
import { fileTypeFromBuffer } from "file-type";
import axios from "axios";

import musicModel from "../models/musics.js";
import handleDirectUploadUpload from "../handlers/handleDirectUpload.js";
import sanitizeYouTubeURL from "../utils/sanitizeUrl.js";

const router = express.Router();
const storage = multer.memoryStorage(); // Use memory storage for quick uploads
const upload = multer({ storage });

router.post("/saveToCloud", async (req, res) => {
    try {
        const { url } = req.body;
        const newUrl = sanitizeYouTubeURL(url);
        if (!newUrl) return;

        console.log(`url: ${newUrl}`);

        const video = await play.video_basic_info(newUrl);
        const title = video.video_details.title;
        const thumbnail = video.video_details.thumbnails.pop().url;

        const existsSong = await musicModel.findOne({ title });

        console.log(`existsSong: ${existsSong}`);

        if (existsSong)
            return res
                .status(409)
                .json({ message: "song already exists!", title });

        // 2. Get audio stream
        const { stream, type } = await play.stream(url, { quality: 2 });

        // 3. Collect audio buffer
        const audioChunks = [];
        for await (const chunk of stream) {
            audioChunks.push(chunk);
        }
        const audioBuffer = Buffer.concat(audioChunks);

        console.log("got audio chunks");

        // 4. Get cover image buffer
        const coverResponse = await axios.get(thumbnail, {
            responseType: "arraybuffer"
        });

        const coverBuffer = Buffer.from(coverResponse.data);

        console.log("got cover buffer");

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
        res.status(501).json({
            message: "internal error",
            e
        });
    }
});

const fun = async (url) => {
    try {
        console.log(url);
        if (!play.yt_validate(url)) {
            console.log("Not a valid YouTube URL");
            return;
        }

        const info = await play.video_info(url);
        const stream = await play.stream(url);

        console.log("Video Info:", info.video_details.title);
        console.log("Stream URL:", stream.url);
    } catch (error) {
        console.error("Error occurred:", error.message);
    }
};

fun(
    sanitizeYouTubeURL(
        "https://m.youtube.com/watch?v=mYUfLYmwJNg&pp =ygULYmx1ZSBidWNrZXQ%3D"
    )
);

export default router;
