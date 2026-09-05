import "dotenv/config";

import http from "http";
import express from "express";
import cors from "cors";
import cron from "node-cron";
const app = express();

const PORT = process.env.PORT || 5000;

import mongoConfig from "./config/mongodb.config.js";
import indexRoutes from "./routes/index.routes.js";
import authRoutes from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import playlistRoutes from "./routes/playlist.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import userRoutes from "./routes/user.routes.js";
import lyrics from "./routes/lyrics.js";
import temp from "./routes/temp.routes.js";
import streamRoutes from "./routes/stream.routes.js";
import statusRoutes from "./routes/status.routes.js";
import AppDetail from "./models/appDetails.js";
import { updateChannels } from "./scripts/channelWorker.js";

import { requireAuth, requireAdmin } from "./moddileware/auth.js";

app.use(express.json());
app.use(
    cors({
        origin: [
            "exp://127.0.0.1:8081",
            "http://10.32.129.27:4321",
            "exp://100.104.246.3:8081",
            "*"
        ]
    })
);

let isWorkerRunning = false;

app.get("/health", (req, res) => {
    res.status(200).send("OK");
});

app.use("/temp", temp);
app.use("/auth", authRoutes);
app.use("/stream", streamRoutes);

app.use("/status", statusRoutes);

app.use("/", requireAuth, indexRoutes);
app.use("/lyrics", requireAuth, lyrics);
app.use("/dashboard", requireAuth, dashboardRoutes);
app.use("/playlist", requireAuth, playlistRoutes);

app.use("/admin", requireAuth, requireAdmin, adminRoutes);
app.use("/users", requireAuth, requireAdmin, userRoutes);

import { resumePendingTasks } from "./scripts/resumeTasks.js";

if (!process.env.VERCEL) {
    // Every day at 7:00 AM
    cron.schedule("0 7 * * *", async () => {
        if (isWorkerRunning) return;

        isWorkerRunning = true;

        try {
            console.log("[Cron] Triggering daily channel sync...");

            await updateChannels();

            console.log("[Daily Sync] Completed.");
        } catch (err) {
            console.error("[Daily Sync] Error:", err);
        } finally {
            isWorkerRunning = false;
        }
    });
}

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
    if (!process.env.VERCEL) {
        setTimeout(resumePendingTasks, 3000);
    }
});

export default app;
