import mongoose from "mongoose";

export const connectDB = async () => {
    let pass = process.env.MONGODB_PASS;
    let dbName = "vividMusic";
    let uri = `mongodb+srv://AdwaithAnandSR:${pass}@cluster0.8os2c.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=Cluster0`;

    try {
        await mongoose.connect(uri);
        console.log("connected to mongodb: ", dbName);

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
    } catch (error) {
        console.log(`error connecting database: `, error);
        throw error; // Rethrow to allow server to handle it or crash if DB fails
    }
};

export default mongoose;
