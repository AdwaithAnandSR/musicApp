import "dotenv/config";

import http from "http";
import express from "express";
import cors from "cors";
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
import yt from "./routes/yt.routes.js";
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

app.get("/health", async (req, res) => {
    res.status(200).send("OK");

    if (process.env.VERCEL) return;

    // If it's already running or evaluating in THIS server process, just return
    if (isWorkerRunning) return;
    isWorkerRunning = true; // Lock immediately before async DB calls

    try {
        const syncStatusDoc = await AppDetail.findOne({
            key: "channel_sync_status"
        });
        // Instead of aggressively assuming a crash if isSyncing is true, we rely on the internal memory flags
        // and next_daily_sync_time to manage state, preventing overlapping syncs if the DB status is stale.
        const nextSyncDoc = await AppDetail.findOne({
            key: "next_daily_sync_time"
        });
        const now = Date.now();
        const ONE_DAY = 24 * 60 * 60 * 1000;

        let shouldSync = false;
        if (!nextSyncDoc || !nextSyncDoc.data) {
            shouldSync = true;
        } else {
            const nextSync = Number(nextSyncDoc.data);
            if (now >= nextSync) {
                shouldSync = true;
            }
        }

        if (shouldSync) {
            console.log(
                `[Health Check] Triggering daily channel sync...`
            );

            updateChannels()
                .then(async () => {
                    const nextRun = Date.now() + ONE_DAY;
                    await AppDetail.findOneAndUpdate(
                        { key: "next_daily_sync_time" },
                        { data: nextRun },
                        { upsert: true }
                    );
                    isWorkerRunning = false;
                    console.log(`[Daily Sync] Completed successfully. Next run scheduled for ${new Date(nextRun).toISOString()}`);
                })
                .catch(err => {
                    console.error("[Daily Sync] Error:", err);
                    isWorkerRunning = false;
                });
        } else {
            // Nothing to do, unlock
            isWorkerRunning = false;
        }
    } catch (e) {
        console.error("Error in health check daily sync logic:", e);
        isWorkerRunning = false;
    }
});
app.use("/temp", temp);
app.use("/admin", yt);
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

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    if (!process.env.VERCEL) {
        setTimeout(resumePendingTasks, 3000);
    }
});

export default app;
