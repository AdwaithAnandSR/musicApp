import 'dotenv/config';

import http from "http";
import express from "express";
import cors from "cors";
const app = express();

const PORT = process.env.PORT || 5000;

import mongoConfig from "./config/mongodb.config.js";
import indexRoutes from "./routes/indexRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import playlistRoutes from "./routes/playlist.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import lyrics from "./routes/lyrics.js";

app.use(express.json());
app.use(
    cors({
        origin: [
            "exp://127.0.0.1:8081",
            "http://10.32.129.27:4321",
            "exp://100.104.246.3:8081",
            "*",
        ]
    })
);

app.use("/", indexRoutes);
app.use("/lyrics", lyrics);
app.use("/dashboard", dashboardRoutes);
app.use("/playlist", playlistRoutes);
app.use("/admin", adminRoutes);

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

export default app;
