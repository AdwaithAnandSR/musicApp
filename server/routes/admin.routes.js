import express from "express";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";

import musicModel from "../models/musics.js";
import lyricsModel from "../models/lyrics.js";
import cleanTxt from "../utils/clearTitle.js";

import {
    getUnSyncedLyrics,
    setSyncedSong,
    getSongsToBeSynced
} from "../handlers/admin/lyricSync.js";
import {
    addLyricsToSong,
    addLyricsDirectToSong
} from "../handlers/admin/addLyric.js";
import getRemainingSongs from "../handlers/admin/getRemainingSong.js";
import addNewLyricToDb from "../handlers/admin/addNewLyricToDb.js";
import getSongById from "../handlers/admin/getSongById.js";
import { searchLyric, searchSong } from "../handlers/admin/search.js";
import removeLyric from "../handlers/admin/removeLyric.js";
import {
    updateArtist,
    deleteSong,
    swapLyric
} from "../handlers/admin/manageSong.js";

const router = express.Router();


router.post("/getUnSyncedLyrics", getUnSyncedLyrics);

router.post("/setSyncedSong", setSyncedSong);

router.post("/removeLyric", removeLyric);

router.post("/addLyricsToSong", addLyricsToSong); // add lyrics from lyrics db

router.post("/addLyricsDirectToSong", addLyricsDirectToSong); // add lyrics that passed as array

router.post("/getRemainingSongsWithoutLyric", getRemainingSongs);

router.post("/getSongsToBeSynced", getSongsToBeSynced);

router.post("/getSongById", getSongById);

router.post("/searchSong", searchSong);

router.post("/searchLyric", searchLyric);

router.post("/deleteSong", deleteSong);

router.post("/updateArtist", updateArtist);

router.post("/swapLyric", swapLyric);

// lyrics model

router.post("/addNewLyricToDb", addNewLyricToDb);

const accounts = [
    {
        CLOUDINARY_CLOUD_NAME: "dmjysfk2r",

        CLOUDINARY_API_SECRET: "6o21ccfrXmh1AOTN3tV49Syb7gQ",

        CLOUDINARY_API_KEY: 498984738152783,

        email: "cloudinary.musics.0.1@gmail.com"
    },
    {
        CLOUDINARY_CLOUD_NAME: "dxyqilfpq",

        CLOUDINARY_API_SECRET: "TJzp2kL8JwqkTCaLeDgNHSfYBzo",

        CLOUDINARY_API_KEY: 389737299973587,

        email: "cloudinary.musics.0.0@gmail.com"
    },

    {
        CLOUDINARY_CLOUD_NAME: "dnlrvfgjk",

        CLOUDINARY_API_SECRET: "-Kyl9jdjYPQQN-57qXs5zFfbSIA",

        CLOUDINARY_API_KEY: 962254451362664,

        email: "adwaithanand1818@gmail.com"
    },

{

CLOUDINARY_CLOUD_NAME: "du0gm3ett",

CLOUDINARY_API_KEY: 918421913634417,

CLOUDINARY_API_SECRET: "7H4DUUV73O-Z-yRCfcadQZ67OlQ", 

email: "adwaith.anand.dev@gmail.com"

}

];

router.get("/cloudStatus", async (req, res) => {
    const formatSize = bytes => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        if (bytes < 1024 * 1024 * 1024)
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    const checkAccount = async account => {
        cloudinary.config({
            cloud_name: account.CLOUDINARY_CLOUD_NAME,
            api_key: account.CLOUDINARY_API_KEY,
            api_secret: account.CLOUDINARY_API_SECRET
        });

        try {
            const usage = await cloudinary.api.usage();

            return {
                email: account.email, cloudName: account.CLOUDINARY_CLOUD_NAME,
                usage: {
                    transformations: usage.transformations.credits_usage + " GB",
                    resources: usage.resources,
                    bandwidth: usage.bandwidth.credits_usage + " GB",
                    storage: usage.storage.credits_usage + " GB",
                    credits: usage.credits
                },
                requests: usage.requests,

            };
        } catch (error) {
            return {
                email: account.email,
                status: "Error",
                message: error.message
            };
        }
    };

    try {
        const results = [];
        for (const account of accounts) {
            const status = await checkAccount(account);
            results.push(status);
        }
        res.json({ accounts: results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
