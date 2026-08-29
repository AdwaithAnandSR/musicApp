import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error("Error: MONGODB_URI environment variable is not defined.");
} else {
    try {
        mongoose
            .connect(uri)
            .then(async () => {
                const dbName = mongoose.connection.name;
                console.log("Connected to MongoDB database:", dbName);

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
                    console.warn(
                        "Could not retrieve MongoDB db stats:",
                        statsErr.message
                    );
                }
            })
            .catch(err => {
                console.error("MongoDB connection error:", err.message);
            });
    } catch (error) {
        console.error("Error connecting to database:", error);
    }
}

export default mongoose;
