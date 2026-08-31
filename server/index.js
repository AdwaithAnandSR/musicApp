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

app.get("/health", async (req, res) => {
    res.status(200).send("OK");
    try {
        const doc = await AppDetail.findOne({ key: "last_daily_sync_time" });
        const now = Date.now();
        const ONE_DAY = 24 * 60 * 60 * 1000;
        
        let shouldSync = false;
        if (!doc || !doc.data) {
            shouldSync = true;
        } else {
            const lastSync = Number(doc.data);
            if (now - lastSync >= ONE_DAY) {
                shouldSync = true;
            }
        }
        
        if (shouldSync) {
            await AppDetail.findOneAndUpdate({ key: "last_daily_sync_time" }, { data: now }, { upsert: true });
            console.log("[Health Check] Triggering daily channel sync...");
            updateChannels().catch(err => console.error("[Daily Sync] Error:", err));
        }
    } catch (e) {
        console.error("Error in health check daily sync logic:", e);
    }
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


app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});



export default app;
