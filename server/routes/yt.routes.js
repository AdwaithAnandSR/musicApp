import express from "express";

const router = express.Router();

import { youtubeDownload } from "../handlers/admin/youtubeDownload.js";

router.post("/youtubeDownload", youtubeDownload);