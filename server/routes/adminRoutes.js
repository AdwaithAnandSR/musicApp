import express from "express";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import axios from "axios";
import ytdl from "ytdl-core";
import play from "play-dl";

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
        try {
            let { cookie, url } = req.body;
            url = sanitizeYouTubeURL(url);
            console.log("\nurl: ", url);
            
            await play.setToken({
                youtube: {
                    cookie: cookie
                }
            });
            
            const isvalid = await play.yt_validate(url);
            console.log("\visvalid : ", isvalid);
            
            const info = await play.video_info(url);
            console.log("\ninfo : ", info);
        } catch (error) {
            console.log(error);
        }

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
