import express from "express";
const router = express.Router();

import create from "../handlers/playlists/create.playlist.js"
import getPlaylists from "../handlers/playlists/get.playlist.js"
import deletePlaylist from "../handlers/playlists/delete.playlist.js"
import addSongs from "../handlers/playlists/add.playlist.js"
import getSongs from "../handlers/playlists/songs.playlist.js"
import { cleanupPlaylists } from "../handlers/playlists/cleanup.playlist.js"

router.post("/create", create);

router.get("/get", getPlaylists);

router.post("/delete", deletePlaylist);

router.post("/add", addSongs);

router.post("/getSongs", getSongs);

router.get("/cleanUp", cleanupPlaylists);


export default router;
