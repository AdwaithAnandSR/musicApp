import AppDetail from "../models/appDetails.js";

export const createRequestLog = (url, limit, skip, type = "client") => {
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
            skipped: 0
        };
        
        AppDetail.findOne({ key: "request_history" }).then(doc => {
            let history = doc ? doc.data : [];
            history.unshift(entry);
            if (history.length > 15) history = history.slice(0, 15);
            AppDetail.findOneAndUpdate({ key: "request_history" }, { data: history }, { upsert: true }).catch(err => console.error(err));
        }).catch(err => console.error(err));
        
        return id;
    } catch (err) {
        console.error("Failed to create request log:", err);
        return null;
    }
};

export const updateRequestLog = (id, statusType) => {
    if (!id) return;
    try {
        AppDetail.findOne({ key: "request_history" }).then(doc => {
            if (!doc) return;
            let history = doc.data;
            const index = history.findIndex(h => h.id === id);
            
            if (index !== -1) {
                if (statusType === "SUCCESS") history[index].success += 1;
                else if (statusType === "ERROR") history[index].errors += 1;
                else if (statusType === "SKIPPED") history[index].skipped += 1;
                
                AppDetail.findOneAndUpdate({ key: "request_history" }, { data: history }, { upsert: true }).catch(err => console.error(err));
            }
        }).catch(err => console.error(err));
    } catch (err) {
        console.error("Failed to update request log:", err);
    }
};
