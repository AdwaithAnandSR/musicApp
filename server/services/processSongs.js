import "dotenv/config";
import mongoose from "mongoose";
import { processAllSongs } from "../services/songAiProcessor.js";

async function main() {
    if (!process.env.MONGODB_PASS) {
        throw new Error("Missing required env var: MONGODB_URI");
    }

    let dbName = "vividMusic";
    let uri = `mongodb+srv://AdwaithAnandSR:${process.env.MONGODB_PASS}@cluster0.8os2c.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=Cluster0`;

    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("MongoDB connected");

    await processAllSongs();
}

main()
    .then(() => (process.exitCode = 0))
    .catch(err => {
        console.error("\nFatal error while processing songs:", err.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
        console.log("MongoDB disconnected");
        process.exit(process.exitCode ?? 0);
    });
