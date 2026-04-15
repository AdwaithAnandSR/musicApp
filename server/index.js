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

app.use("/temp", temp);
app.use("/auth", authRoutes);

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
