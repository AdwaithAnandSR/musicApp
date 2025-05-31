import express from "express";
import mongoose from "mongoose";

import musicModel from "../models/musics.js";
import lyricsModel from "../models/lyrics.js";

import cleanTxt from "../utils/clearTitle.js";

const router = express.Router();

router.post("/insert", async (req, res) => {
    try {
        const { title, details, lyrics } = req.body;

        if (title.length > 0 && lyrics) {
            const exists = await lyricsModel.findOne({ title });
            if (exists) return res.status(401).json({ message: "failed" });
            await lyricsModel.create({ title, details, lyrics });
            return res.status(200).json({ message: "Success" });
        }

        return res.status(410).json({ message: "Success" });
    } catch (e) {
        console.log(e);
        res.status(400).json({ message: "failed" });
    }
});

router.get("/get", async (req, res) => {
    try {
        const songs = await musicModel.find({ cover: { $eq: null } });
        res.json({ songs });
    } catch (e) {
        console.log(e);
        res.status(400).json({ message: "failed" });
    }
});

export default router;
