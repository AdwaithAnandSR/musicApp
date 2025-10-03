import { v2 as cloudinary } from "cloudinary";

const cloudStatus = async (req, res) => {
    const results = [];
    const accounts = process.env.ACCOUNTS;

    const formatSize = bytes => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        if (bytes < 1024 * 1024 * 1024)
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    const checkAccount = async account => {
        cloudinary.config({
            cloud_name: account.CLOUDINARY_CLOUD_NAME,
            api_key: account.CLOUDINARY_API_KEY,
            api_secret: account.CLOUDINARY_API_SECRET
        });

        try {
            const usage = await cloudinary.api.usage();

            return {
                email: account.email,
                cloudName: account.CLOUDINARY_CLOUD_NAME,
                usage: {
                    transformations:
                        usage.transformations.credits_usage + " GB",
                    resources: usage.resources,
                    bandwidth: usage.bandwidth.credits_usage + " GB",
                    storage: usage.storage.credits_usage + " GB",
                    credits: usage.credits
                },
                requests: usage.requests
            };
        } catch (error) {
            return {
                email: account.email,
                status: "Error",
                message: error.message
            };
        }
    };

    if (accounts) {
        for (let i = 1; i <= accounts; i++) {
            const account = {
                CLOUDINARY_CLOUD_NAME:
                    process.env[`CLOUDINARY_CLOUD_NAME_${i}`],
                CLOUDINARY_API_SECRET:
                    process.env[`CLOUDINARY_API_SECRET_${i}`],
                CLOUDINARY_API_KEY: process.env[`CLOUDINARY_API_KEY_${i}`],
                email: process.env[`CLOUDINARY_EMAIL_${i}`]
            };
            const status = await checkAccount(account);
            results.push(status);
        }
    }

    res.json({ accounts: results });
};

export default cloudStatus;
