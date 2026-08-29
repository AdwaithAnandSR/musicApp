import mongoose from "mongoose";

const pass = process.env.MONGODB_PASS;
const dbName = process.env.MONGODB_DB_NAME || "vividMusic";
const uri = process.env.MONGODB_URI || `mongodb+srv://AdwaithAnandSR:${pass}@cluster0.8os2c.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=Cluster0`;

try {
    mongoose.connect(uri).then(async () => {
        console.log("connected to mongodb: ", dbName);

        try {
            const stats = await mongoose.connection.db.stats();
            const dataSizeMB = stats.dataSize / 1024 / 1024;
            const indexSizeMB = stats.indexSize / 1024 / 1024;
            const totalUsedMB = dataSizeMB + indexSizeMB;
            const remainingMB = 500 - totalUsedMB;

            console.log(`Data size: ${dataSizeMB.toFixed(2)} MB`);
            console.log(`Index size: ${indexSizeMB.toFixed(2)} MB`);
            console.log(`Total used: ${totalUsedMB.toFixed(2)} MB`);
            console.log(
                `Remaining free storage (out of 512 MB): ${remainingMB.toFixed(
                    2
                )} MB`
            );
        } catch (statsErr) {
            console.warn("Could not retrieve MongoDB db stats:", statsErr.message);
        }
    }).catch(err => {
        console.error("MongoDB connection error:", err.message);
    });
} catch (error) {
    console.error("Error connecting to database:", error);
}

export default mongoose;
