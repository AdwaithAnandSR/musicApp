import express from "express";
import mongoose from "mongoose";

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
import searchSong from "../handlers/admin/searchSongs.js";
import removeLyric from "../handlers/admin/removeLyric.js";

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

// lyrics model

router.post("/addNewLyricToDb", addNewLyricToDb);

export default router;
