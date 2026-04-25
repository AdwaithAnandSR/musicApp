import express from "express";
const router = express.Router();

import create from "../handlers/playlists/create.playlist.js"
import getPlaylists from "../handlers/playlists/get.playlist.js"
import deletePlaylist from "../handlers/playlists/delete.playlist.js"
import addSongs from "../handlers/playlists/add.playlist.js"
import { getSongs } from "../handlers/playlists/songs.playlist.js"
import removeSong from "../handlers/playlists/remove.playlist.js"
import { cleanupPlaylists } from "../handlers/playlists/cleanup.playlist.js"


// playlist
router.post("/create", create);

router.post("/get", getPlaylists);

router.post("/delete", deletePlaylist);


// playlist songs
router.post("/add", addSongs);

router.get("/getSongs", getSongs);

router.post("/remove", removeSong);

router.get("/cleanUp", cleanupPlaylists);


export default router;
