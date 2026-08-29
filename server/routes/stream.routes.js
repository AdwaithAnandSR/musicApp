import express from "express";
import { spawn } from "child_process";
import path from "path";

const router = express.Router();

router.get("/:ytId", (req, res) => {
    const ytId = req.params.ytId;
    const url = `https://www.youtube.com/watch?v=${ytId}`;

    const ytdlpPath = path.resolve(process.cwd(), "bin", "yt-dlp");
    const ytdlp = spawn("python3", [
        ytdlpPath,
        url,
        "-f", "bestaudio/best",
        "-o", "-"
    ]);

    res.setHeader("Content-Type", "audio/mpeg");

    ytdlp.stdout.pipe(res);

    ytdlp.stderr.on("data", (data) => {
        console.error(`yt-dlp stderr: ${data}`);
    });

    ytdlp.on("error", (error) => {
        console.error("Failed to start yt-dlp process:", error);
        res.end();
    });

    ytdlp.on("close", (code) => {
        if (code !== 0) {
            console.error(`yt-dlp process exited with code ${code}`);
        }
        res.end();
    });
});

export default router;
