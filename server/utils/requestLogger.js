import fs from "fs";
import path from "path";

const REQUEST_HISTORY_FILE = path.resolve(process.cwd(), "request_history.json");

export const createRequestLog = (url, limit, skip, type = "client") => {
    try {
        let history = [];
        if (fs.existsSync(REQUEST_HISTORY_FILE)) {
            const data = fs.readFileSync(REQUEST_HISTORY_FILE, "utf-8");
            if (data) history = JSON.parse(data);
        }
        
        const id = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
        const entry = {
            id,
            timestamp: new Date().toISOString(),
            type,
            url,
            limit,
            skip,
            success: 0,
            errors: 0,
            skipped: 0
        };
        
        history.unshift(entry);
        if (history.length > 15) history = history.slice(0, 15);
        
        fs.writeFileSync(REQUEST_HISTORY_FILE, JSON.stringify(history, null, 2));
        return id;
    } catch (err) {
        console.error("Failed to create request log:", err);
        return null;
    }
};

export const updateRequestLog = (id, statusType) => {
    if (!id) return;
    try {
        if (!fs.existsSync(REQUEST_HISTORY_FILE)) return;
        
        let history = JSON.parse(fs.readFileSync(REQUEST_HISTORY_FILE, "utf-8"));
        const index = history.findIndex(h => h.id === id);
        
        if (index !== -1) {
            if (statusType === "SUCCESS") history[index].success += 1;
            else if (statusType === "ERROR") history[index].errors += 1;
            else if (statusType === "SKIPPED") history[index].skipped += 1;
            
            fs.writeFileSync(REQUEST_HISTORY_FILE, JSON.stringify(history, null, 2));
        }
    } catch (err) {
        console.error("Failed to update request log:", err);
    }
};
