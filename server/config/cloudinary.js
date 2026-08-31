import { v2 as cloudinary } from "cloudinary";
import "dotenv/config";

if (process.env.CLOUDINARY_URL) {
    cloudinary.config({
        cloudinary_url: process.env.CLOUDINARY_URL,
        secure: true
    });
} else {
    const cloudName =
        process.env.CLOUDINARY_CLOUD_NAME ||
        process.env.CLOUDINARY_CLOUD_NAME_1;
    const apiKey =
        process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY_1;
    const apiSecret =
        process.env.CLOUDINARY_API_SECRET ||
        process.env.CLOUDINARY_API_SECRET_1;

    if (cloudName && apiKey && apiSecret) {
        cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
            secure: true
        });
    }
}

export default cloudinary;
