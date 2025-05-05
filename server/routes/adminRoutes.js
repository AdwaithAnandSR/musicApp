import express from "express";
import multer from "multer";
import play from "play-dl";
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

        const video = await play.video_basic_info(newUrl);
        const title = video.video_details.title;
        const thumbnail = video.video_details.thumbnails.pop().url;

        const existsSong = await musicModel.findOne({ title });

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

        // 4. Get cover image buffer
        const coverResponse = await axios.get(thumbnail, {
            responseType: "arraybuffer"
        });
        const coverBuffer = Buffer.from(coverResponse.data);

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
        console.log(e);
        res.status(501).json({
            message: "internal error",
            e
        });
    }
});

// router.post("/addSongs", upload.array("audioFiles"), async (req, res) => {
//     const files = req.files;
//     if (!files || files.length === 0) {
//         return res.status(400).json({
//             message: "at least one audio file are required"
//         });
//     }
//     handleUpload(files, res);
// });

export default router;
