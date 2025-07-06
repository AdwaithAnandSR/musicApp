import express from "express";
import mongoose from "mongoose";

import musicModel from "../models/musics.js";
import lyricsModel from "../models/lyrics.js";

import cleanTxt from "../utils/clearTitle.js";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const result = await musicModel.find().limit(20);

        res.send(result);
    } catch (e) {
        console.log(e);
        res.status(400).json({ message: "failed" });
    }
});

export default router;
