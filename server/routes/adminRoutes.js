import express from "express";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import axios from "axios";
import play from "play-dl";

import musicModel from "../models/musics.js";
// import handleDirectUploadUpload from "../handlers/handleDirectUpload.js";

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
        const { cookie, url } = req.body;
        
        console.log(url);

        play.setToken({
            cookie: cookie
        });
        

        (async () => {
            const info = await play.video_info(sanitizeYouTubeURL(url));
            console.log(info.video_details.title);
        })();

        // const audioType = await fileTypeFromBuffer(audioBuffer);
        // const coverType = await fileTypeFromBuffer(coverBuffer);

        // handleDirectUploadUpload({
        //     title,
        //     audioType,
        //     coverType,
        //     audioBuffer,
        //     coverBuffer,
        //     res
        // });
    } catch (e) {
        console.log("error at admin routes", e);
        res.status(501).json({ message: "internal error", e });
    }
});

export default router;
