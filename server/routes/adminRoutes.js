import express from "express";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import axios from "axios";
import ytdl from "ytdl-core";
import play from "play-dl";

// import musicModel from "../models/musics.js";
// import streamToBuffer from "../utils/streamToBuffer.js";
// import handleDirectUploadUpload from "../handlers/handleDirectUpload.js";

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
                    cookie: cookie,
                    client: "WEB"
                }
            });

            const isvalid = await play.yt_validate(url);
            if (!isvalid)
                return res.status(403).json({
                    message: "not a valid url"
                });

            const info = await play.video_info(url);
            console.log("\ntitle : ", info.video_details.title);

            const stream = await play.stream(videoURL);

            const audioChunks = [];
            stream.stream.on("data", chunk => audioChunks.push(chunk));
            await new Promise(resolve => stream.stream.on("end", resolve));

            const audioBuffer = Buffer.concat(audioChunks);

            // Step 3: Download and buffer the cover image
            const thumbnailURL = info.video_details.thumbnails.pop().url;
            const coverRes = await axios.get(thumbnailURL, {
                responseType: "arraybuffer"
            });
            const coverBuffer = Buffer.from(coverRes.data);

            // Now you can use audioBuffer and coverBuffer
            console.log("audioBuffer size:", audioBuffer.length);
            console.log("coverBuffer size:", coverBuffer.length);

            const audioType = await fileTypeFromBuffer(audioBuffer);
            const coverType = await fileTypeFromBuffer(coverBuffer);

            console.log(audioType, coverType);
        } catch (error) {
            console.log(error);
        }

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
