import express from "express";
import fs from "fs";
import path from "path";
import { updateChannels } from "../scripts/channelWorker.js";

const router = express.Router();

const getFileContent = (filename) => {
    const filePath = path.resolve(process.cwd(), filename);
    if (fs.existsSync(filePath)) {
        try {
            return JSON.parse(fs.readFileSync(filePath, "utf-8"));
        } catch (e) {
            return { error: "Failed to parse JSON" };
        }
    }
    return null;
};

router.get("/", (req, res) => {
    const downloadHistory = getFileContent("download_history.json") || [];
    const requestHistory = getFileContent("request_history.json") || [];
    const channelConfig = getFileContent("channel.json") || [];

    const formatJSON = (obj) => JSON.stringify(obj, null, 2).replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Server Status</title>
        <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; background: #f4f4f5; color: #18181b; }
            h1 { color: #27272a; }
            .container { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; }
            .card { background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); overflow: hidden; }
            .card h2 { margin-top: 0; color: #3f3f46; border-bottom: 2px solid #e4e4e7; padding-bottom: 0.5rem; }
            pre { background: #1e1e2e; color: #a6accd; padding: 1rem; border-radius: 6px; overflow-x: auto; font-size: 0.9rem; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Server Synchronization Status</h1>
            
            <div class="card">
                <h2>Request History (Latest 15)</h2>
                <pre><code>${formatJSON(requestHistory)}</code></pre>
            </div>

            <div class="card">
                <h2>Channel Auto-Update Configuration</h2>
                <pre><code>${formatJSON(channelConfig)}</code></pre>
            </div>

            <div class="card">
                <h2>Download History (Latest 50)</h2>
                <pre><code>${formatJSON(downloadHistory)}</code></pre>
            </div>
        </div>
    </body>
    </html>
    `;
    
    res.send(html);
});

router.get("/json", (req, res) => {
    res.json({
        requestHistory: getFileContent("request_history.json"),
        channelConfig: getFileContent("channel.json"),
        downloadHistory: getFileContent("download_history.json")
    });
});


router.get("/trigger-sync", (req, res) => {
    console.log("[API] Triggered channel sync from public endpoint.");
    updateChannels().catch(err => console.error("[API] Channel update failed:", err));
    res.json({ success: true, message: "Channel auto-update started in the background." });
});

export default router;
