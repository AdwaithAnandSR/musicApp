import AppDetail from "../models/appDetails.js";

export const createRequestLog = async (url, limit, skip, type = "client") => {
    try {
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
            skipped: 0,
            status: "RUNNING",
            currentTitle: "Initializing..."
        };
        
        const doc = await AppDetail.findOne({ key: "request_history" });
        let history = doc ? doc.data : [];
        history.unshift(entry);
        if (history.length > 15) history = history.slice(0, 15);
        await AppDetail.findOneAndUpdate({ key: "request_history" }, { data: history }, { upsert: true });
        
        return id;
    } catch (err) {
        console.error("Failed to create request log:", err);
        return null;
    }
};

export const updateRequestLog = async (id, statusType) => {
    if (!id) return;
    try {
        const doc = await AppDetail.findOne({ key: "request_history" });
        if (!doc) return;
        let history = doc.data;
        const index = history.findIndex(h => h.id === id);
        
        if (index !== -1) {
            if (statusType === "SUCCESS") history[index].success += 1;
            else if (statusType === "ERROR") history[index].errors += 1;
            else if (statusType === "SKIPPED") history[index].skipped += 1;
            
            await AppDetail.findOneAndUpdate({ key: "request_history" }, { data: history }, { upsert: true });
        }
    } catch (err) {
        console.error("Failed to update request log:", err);
    }
};

export const setRequestCurrentItem = async (id, title) => {
    if (!id) return;
    try {
        const doc = await AppDetail.findOne({ key: "request_history" });
        if (!doc) return;
        let history = doc.data;
        const index = history.findIndex(h => h.id === id);
        if (index !== -1) {
            history[index].currentTitle = title;
            await AppDetail.findOneAndUpdate({ key: "request_history" }, { data: history }, { upsert: true });
        }
    } catch (err) {
        console.error("Failed to set request current item:", err);
    }
};

export const markRequestDone = async (id) => {
    if (!id) return;
    try {
        const doc = await AppDetail.findOne({ key: "request_history" });
        if (!doc) return;
        let history = doc.data;
        const index = history.findIndex(h => h.id === id);
        if (index !== -1) {
            history[index].status = "COMPLETED";
            history[index].currentTitle = "Done";
            await AppDetail.findOneAndUpdate({ key: "request_history" }, { data: history }, { upsert: true });
        }
    } catch (err) {
        console.error("Failed to mark request as done:", err);
    }
};
