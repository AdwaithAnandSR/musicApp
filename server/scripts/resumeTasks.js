import fs from "fs";
import path from "path";
import AppDetail from "../models/appDetails.js";
import { processBackgroundDownload } from "../handlers/admin/youtubeDownload.js";

export const resumePendingTasks = async () => {
    console.log("[Resume] Checking for pending manual tasks...");
    try {
        const doc = await AppDetail.findOne({ key: "request_history" });
        if (!doc || !doc.data) return;
        
        const history = doc.data;

        for (let i = 0; i < history.length; i++) {
            const req = history[i];
            if (req.status === "RUNNING") {
                console.log(`[Resume] Found orphaned task for URL: ${req.url} (ID: ${req.id})`);
                
                // Calculate where it left off
                const success = req.success || 0;
                const errors = req.errors || 0;
                const skipped = req.skipped || 0;
                const processed = success + errors + skipped;
                
                const originalLimit = parseInt(req.limit, 10);
                const originalSkip = parseInt(req.skip, 10);
                
                const newSkip = (isNaN(originalSkip) ? 0 : originalSkip) + processed;
                const newLimit = (isNaN(originalLimit) ? 1 : originalLimit) - processed;
                
                if (newLimit > 0) {
                    console.log(`[Resume] Resuming task ${req.id} - New Skip: ${newSkip}, Remaining Limit: ${newLimit}`);
                    
                    // Recover cookie file if possible
                    let cookieFile = null;
                    try {
                        const cookieDoc = await AppDetail.findOne({ key: "youtube_cookies" });
                        if (cookieDoc && cookieDoc.data) {
                            cookieFile = path.resolve(process.cwd(), `cookies-resume-${Date.now()}.txt`);
                            fs.writeFileSync(cookieFile, cookieDoc.data, { mode: 0o600 });
                        }
                    } catch (e) {}

                    // Await the background process to prevent OOM from too many concurrent yt-dlp instances
                    await processBackgroundDownload(req.url, newSkip, newLimit, cookieFile, req.id)
                        .catch(err => console.error(`[Resume] Task ${req.id} failed:`, err));
                } else {
                    console.log(`[Resume] Task ${req.id} actually finished processing all items before crash. Marking complete.`);
                    const { markRequestDone } = await import("../utils/requestLogger.js");
                    await markRequestDone(req.id);
                }
            }
        }
        
    } catch (e) {
        console.error("[Resume] Error resuming tasks:", e);
    }
};
