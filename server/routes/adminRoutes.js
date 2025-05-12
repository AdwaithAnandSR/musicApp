import express from "express";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import axios from "axios";
import ytdl from "ytdl-core";
import play from "play-dl";
// import { getRandomIPv6 } from "ytdl-core/lib/utils.js";

// import musicModel from "../models/musics.js";
import {
    streamToBuffer,
    getCoverImageBuffer
} from "../utils/streamToBuffer.js";
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

const fun = async url => {
    try {
        const isValid = await ytdl.validateURL(url);
        if (!isValid) return console.log("not a valid url!");

        const info = await ytdl.getInfo(url);
        const thumbnails = info.videoDetails.thumbnails;
        const bestThumbnail = thumbnails[thumbnails.length - 1]; // usually the highest resolution


        const stream = ytdl(url, {
            filter: "audioonly",
            quality: "highestaudio"
        });

        const audioBuffer = await streamToBuffer(stream);
        const coverBuffer = await getCoverImageBuffer(bestThumbnail)
        
        console.log(info.videoDetails.title);
        console.log("audioBuffer size:", audioBuffer.length);
        console.log("coverBuffer size:", coverBuffer.length, coverBuffer);
    } catch (error) {
        console.log(error);
    }
};

fun("https://www.youtube.com/watch?v=mYUfLYmwJNg");

router.post("/saveToCloud", async (req, res) => {
    try {
        try {
            let { cookie, url } = req.body;
            url = sanitizeYouTubeURL(url);
            console.log("\nurl: ", url);

            const agentForARandomIP = ytdl.createAgent(undefined, {
                localAddress: getRandomIPv6("2001:2::/48")
            });

            const info = await ytdl.getBasicInfo(
                "http://www.youtube.com/watch?v=aqz-KE-bpKQ",
                {
                    agent: agentForARandomIP
                }
            );

            console.log(info);

            // Now you can use audioBuffer and coverBuffer
            // console.log("audioBuffer size:", audioBuffer.length);
            // console.log("coverBuffer size:", coverBuffer.length);

            // const audioType = await fileTypeFromBuffer(audioBuffer);
            // const coverType = await fileTypeFromBuffer(coverBuffer);

            // console.log(audioType, coverType);
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
