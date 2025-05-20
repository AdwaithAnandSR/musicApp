import express from "express";
const router = express.Router();

import musicModel from "../models/musics.js";

router.post("/getSongs", async (req, res) => {
    const { page } = req.body;
    const limit = 30;
    const data = await musicModel
        .find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
    res.json({ data });
});

router.get("/getAllSongs", async (req, res) => {
    const data = await musicModel.find().sort({ createdAt: -1 });
    res.json({ data });
});

export default router;
