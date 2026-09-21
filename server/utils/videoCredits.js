import { v2 as cloudinary } from "cloudinary";
import AppDetail from "../models/appDetails.js";

// ── Video Cloudinary Usage (cached 5 min) ────────────────────────────────────

let _videoCache = null;
let _videoCacheTime = 0;
const VIDEO_CACHE_TTL = 5 * 60 * 1000;

const formatBytes = b => {
    if (!b || b === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return (b / Math.pow(1024, i)).toFixed(2) + " " + units[i];
};

export const getVideoCloudinaryUsage = async () => {
    const now = Date.now();
    if (_videoCache && now - _videoCacheTime < VIDEO_CACHE_TTL) {
        return _videoCache;
    }
    try {
        const usage = await cloudinary.api.usage({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME_VIDEO,
            api_key: process.env.CLOUDINARY_API_KEY_VIDEO,
            api_secret: process.env.CLOUDINARY_API_SECRET_VIDEO
        });

        const result = {
            plan: usage.plan || "Free",
            credits: {
                used: usage.credits?.usage ?? 0,
                limit: usage.credits?.limit ?? 25,
                usedPercent: usage.credits?.used_percent ?? 0
            },
            storage: {
                usedBytes: usage.storage?.usage ?? 0,
                limitBytes: usage.storage?.limit ?? 0,
                usedFormatted: formatBytes(usage.storage?.usage ?? 0),
                limitFormatted: formatBytes(usage.storage?.limit ?? 0),
                usedPercent: usage.storage?.credits_usage
                    ? (usage.storage.credits_usage / 20) * 100
                    : 0
            },
            bandwidth: {
                usedBytes: usage.bandwidth?.usage ?? 0,
                limitBytes: usage.bandwidth?.limit ?? 0,
                usedFormatted: formatBytes(usage.bandwidth?.usage ?? 0),
                limitFormatted: formatBytes(usage.bandwidth?.limit ?? 0),
                usedPercent: parseInt(usage.bandwidth?.used_percent ?? 0)
            },
            transformations: {
                used: usage.transformations?.usage ?? 0,
                limit: usage.transformations?.limit ?? 0,
                usedPercent: usage.transformations?.used_percent ?? 0
            },
            resources: usage.resources ?? 0,
            lastUpdated: usage.last_updated || null
        };
        _videoCache = result;
        _videoCacheTime = now;
        return result;
    } catch (err) {
        console.error("[Video Cloudinary Usage] Error:", err.message);
        return _videoCache || null;
    }
};

// ── Credit Blocking ──────────────────────────────────────────────────────────

const VIDEO_CREDIT_BLOCK_THRESHOLD = 20;

export const isVideoDownloadBlocked = async () => {
    try {
        const usage = await getVideoCloudinaryUsage();
        if (!usage) {
            return {
                blocked: false,
                reason: "",
                creditsUsed: 0,
                creditsLimit: 25
            };
        }

        const used = usage.credits.used;
        const limit = usage.credits.limit;

        if (used >= VIDEO_CREDIT_BLOCK_THRESHOLD) {
            return {
                blocked: true,
                reason: `Video downloads paused — ${used.toFixed(2)}/${limit} credits used (threshold: ${VIDEO_CREDIT_BLOCK_THRESHOLD}). Reserving ${limit - VIDEO_CREDIT_BLOCK_THRESHOLD} credits for bandwidth.`,
                creditsUsed: used,
                creditsLimit: limit
            };
        }

        return {
            blocked: false,
            reason: "",
            creditsUsed: used,
            creditsLimit: limit
        };
    } catch (err) {
        console.error("[Video Credits] Error checking credits:", err.message);
        return {
            blocked: false,
            reason: "",
            creditsUsed: 0,
            creditsLimit: 25
        };
    }
};

// ── Video Download History ───────────────────────────────────────────────────

export const logVideoDownload = async (
    title,
    ytId,
    songId,
    status,
    details,
    source
) => {
    try {
        const doc = await AppDetail.findOne({
            key: "video_download_history"
        });
        let history = doc && Array.isArray(doc.data) ? doc.data : [];
        history.unshift({
            title,
            ytId,
            songId,
            status,
            details,
            source,
            timestamp: new Date().toISOString()
        });
        if (history.length > 100) history = history.slice(0, 100);
        await AppDetail.findOneAndUpdate(
            { key: "video_download_history" },
            { data: history },
            { upsert: true }
        );
    } catch (err) {
        console.error(
            "[Video Credits] Failed to log video download:",
            err.message
        );
    }
};

// ── Video Sync Status (live) ─────────────────────────────────────────────────

export const updateVideoSyncStatus = async statusObj => {
    try {
        await AppDetail.findOneAndUpdate(
            { key: "video_sync_status" },
            { data: statusObj },
            { upsert: true }
        );
    } catch (err) {
        console.error(
            "[Video Credits] Failed to update sync status:",
            err.message
        );
    }
};

// ── Video Sync History ───────────────────────────────────────────────────────

export const logVideoSyncRun = async runObj => {
    try {
        const doc = await AppDetail.findOne({ key: "video_sync_history" });
        let history = doc && Array.isArray(doc.data) ? doc.data : [];
        history.unshift(runObj);
        if (history.length > 50) history = history.slice(0, 50);
        await AppDetail.findOneAndUpdate(
            { key: "video_sync_history" },
            { data: history },
            { upsert: true }
        );
    } catch (err) {
        console.error(
            "[Video Credits] Failed to log sync run:",
            err.message
        );
    }
};
