const express = require("express");
const multer = require("multer");
const router = express.Router();

const storage = multer.memoryStorage(); // Use memory storage for quick uploads
const upload = multer({ storage });

const musicModel = require("../models/musics.js");
const handleUpload = require("../handlers/upload.handler.js");

router.post("/addSongs", upload.array("audioFiles"), async (req, res) => {
   const files = req.files;
   if (!files || files.length === 0) {
      return res.status(400).json({
         message: "at least one audio file are required"
      });
   }
   handleUpload(files, res);
});

module.exports = router;