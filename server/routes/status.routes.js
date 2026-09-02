import express from "express";
import fs from "fs";
import path from "path";
import { updateChannels } from "../scripts/channelWorker.js";
import AppDetail from "../models/appDetails.js";

const router = express.Router();

const getFileContent = async (key) => {
    try {
        const doc = await AppDetail.findOne({ key });
        let data = (doc && doc.data) ? doc.data : [];
        
        if (key === "channel_config") {
            const p = path.resolve(process.cwd(), "channel.json");
            if (fs.existsSync(p)) {
                const diskData = JSON.parse(fs.readFileSync(p, "utf-8"));
                if (Array.isArray(data) && Array.isArray(diskData)) {
                    const merged = [...data];
                    for (const diskCh of diskData) {
                        if (!merged.some(c => c.channel === diskCh.channel)) {
                            merged.push(diskCh);
                        }
                    }
                    data = merged;
                }
            }
        }
        
        if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
            return data;
        }
        return [];
    } catch (e) {
        return [];
    }
};

const CLIENT_SCRIPT = `
    var timeEls = document.querySelectorAll('.client-time');
    for (var i = 0; i < timeEls.length; i++) {
        var el = timeEls[i];
        var d = new Date(el.getAttribute('data-iso'));
        if (!isNaN(d.getTime())) {
            var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            var month = months[d.getMonth()];
            var day = d.getDate();
            var hours = d.getHours();
            var minutes = d.getMinutes().toString();
            if (minutes.length < 2) minutes = '0' + minutes;
            var ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; 
            el.innerText = month + ' ' + day + ', ' + hours + ':' + minutes + ' ' + ampm;
        }
    }

    var pollingInterval = null;
    
    function showMessage(msg, isError) {
        if (isError === undefined) isError = false;
        var el = document.getElementById('actionMessage');
        el.innerText = msg;
        el.style.display = 'block';
        el.style.backgroundColor = isError ? 'rgba(207, 102, 121, 0.2)' : 'rgba(3, 218, 198, 0.2)';
        el.style.color = isError ? 'var(--error)' : 'var(--success)';
        el.style.border = '1px solid ' + (isError ? 'var(--error)' : 'var(--success)');
        setTimeout(function() { el.style.display = 'none'; }, 4000);
    }

    function updateProgressUI(status) {
        var container = document.getElementById('sync-progress-container');
        if (!status.isSyncing) {
            container.style.display = 'none';
            if (pollingInterval) clearInterval(pollingInterval);
            return;
        }
        
        container.style.display = 'block';
        var displayChannel = status.currentChannel || '...';
        if (displayChannel !== '...') {
            displayChannel = displayChannel.replace(/\\/videos\\/?$/, '');
        }
        document.getElementById('sync-channel').innerText = 'Channel: ' + displayChannel;
        document.getElementById('sync-message').innerText = status.message || 'Processing...';
        
        var total = status.totalSongs || 0;
        var current = status.currentSongIndex || 0;
        document.getElementById('sync-progress').innerText = current + ' / ' + total;
        
        var pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
        document.getElementById('sync-bar').style.width = pct + '%';
        
        document.getElementById('sync-success').innerText = '✓ ' + (status.successCount || 0);
        document.getElementById('sync-error').innerText = '✗ ' + (status.errorCount || 0);
        document.getElementById('sync-skipped').innerText = '⏭ ' + (status.skippedCount || 0);
        document.getElementById('sync-title').innerText = 'Current: ' + (status.currentSongTitle || '...');
        
        if (!pollingInterval) {
            pollingInterval = setInterval(pollStatus, 2000);
        }
    }

    function pollStatus() {
        fetch('/status/json')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.syncStatus) updateProgressUI(data.syncStatus);
                else updateProgressUI({ isSyncing: false });
            })
            .catch(function(e) { console.error(e); });
    }
    
    function triggerSync() {
        showMessage("Background sync triggered!");
        fetch('/status/trigger-sync')
            .then(function(res) { return res.json(); })
            .then(function(data) { console.log(data); })
            .catch(function(err) {
                console.error(err);
                showMessage("Failed to trigger sync", true);
            });
    }
    
    function updateSyncTime() {
        var timeInput = document.getElementById('newSyncTime').value;
        if (!timeInput) return showMessage("Please select a time first.", true);
        
        var ms = new Date(timeInput).getTime();
        if (isNaN(ms)) return showMessage("Invalid time.", true);
        
        fetch('/status/update-sync-time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nextTime: ms })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                showMessage("Next sync time updated!");
                setTimeout(function() { location.reload(); }, 1500);
            } else showMessage("Failed: " + data.error, true);
        })
        .catch(function(err) {
            console.error(err);
            showMessage("Network error occurred.", true);
        });
    }
    
    function deleteChannel(encodedUrl) {
        if (!confirm("Are you sure you want to delete this channel?")) {
            return;
        }
        var channelUrl = decodeURIComponent(encodedUrl);
        showMessage("Removing channel...");
        fetch('/status/delete-channel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ channel: channelUrl })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                showMessage("Channel removed successfully.");
                setTimeout(function() { location.reload(); }, 1500);
            } else {
                showMessage("Failed to remove channel: " + data.error, true);
            }
        })
        .catch(function(err) {
            console.error(err);
            showMessage("Error removing channel.", true);
        });
    }
`;

const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    return `<span class="client-time" data-iso="${isoString}">${isoString}</span>`;
};

router.get("/", async (req, res) => {
    const downloadHistory = await getFileContent("download_history") || [];
    const requestHistory = await getFileContent("request_history") || [];
    const channelConfig = await getFileContent("channel_config") || [];
    const syncStatus = await getFileContent("channel_sync_status") || { isSyncing: false };
    
    const nextSyncDoc = await AppDetail.findOne({ key: "next_daily_sync_time" });
    let nextSyncTime = nextSyncDoc && nextSyncDoc.data ? new Date(Number(nextSyncDoc.data)).toISOString() : null;
    
    if (!nextSyncTime) {
        const lastSyncDoc = await AppDetail.findOne({ key: "last_daily_sync_time" });
        const lastSyncTime = lastSyncDoc && lastSyncDoc.data ? Number(lastSyncDoc.data) : null;
        if (lastSyncTime) {
            nextSyncTime = new Date(lastSyncTime + 24 * 60 * 60 * 1000).toISOString();
        }
    }

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Server Status</title>
        <style>
            :root {
                --bg: #121212;
                --card-bg: #1e1e1e;
                --text-main: #e0e0e0;
                --text-muted: #9e9e9e;
                --accent: #bb86fc;
                --success: #03dac6;
                --error: #cf6679;
                --warning: #ffb74d;
                --border: #333;
            }
            body { 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                margin: 0; padding: 16px; 
                background: var(--bg); color: var(--text-main); 
                line-height: 1.5;
            }
            h1 { color: var(--accent); font-size: 1.5rem; text-align: center; margin-bottom: 24px; }
            h2 { color: #fff; font-size: 1.2rem; border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-top: 32px; }
            
            .card {
                background: var(--card-bg);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 12px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                position: relative;
            }
            .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
            .time { font-size: 0.85rem; color: var(--text-muted); }
            
            .badge {
                padding: 4px 8px; border-radius: 16px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase;
            }
            .badge.success { background: rgba(3, 218, 198, 0.2); color: var(--success); }
            .badge.error { background: rgba(207, 102, 121, 0.2); color: var(--error); }
            .badge.warning { background: rgba(255, 183, 77, 0.2); color: var(--warning); }
            .badge.worker { background: rgba(187, 134, 252, 0.2); color: var(--accent); }
            .badge.client { background: rgba(33, 150, 243, 0.2); color: #64b5f6; }
            
            .title { font-size: 1rem; font-weight: 500; margin-bottom: 4px; word-break: break-all; }
            .details { font-size: 0.85rem; color: var(--text-muted); word-break: break-all; }
            
            .stats-row { display: flex; gap: 16px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); }
            .stat { font-size: 0.85rem; display: flex; align-items: center; gap: 4px; }
            .stat.s { color: var(--success); }
            .stat.e { color: var(--error); }
            .stat.k { color: var(--warning); }

            .btn {
                display: block; width: 100%; padding: 14px; margin-top: 32px;
                background: var(--accent); color: #000; text-align: center;
                border: none; border-radius: 8px; font-weight: bold; font-size: 1rem;
                cursor: pointer; text-decoration: none;
            }
            .btn:active { opacity: 0.8; }
            
            .btn-delete {
                position: absolute; top: 16px; right: 16px;
                background: rgba(207, 102, 121, 0.2); color: var(--error);
                border: 1px solid var(--error); border-radius: 4px;
                padding: 4px 8px; font-size: 0.75rem; cursor: pointer;
            }
            .btn-delete:active { opacity: 0.8; }
            
            .empty { text-align: center; color: var(--text-muted); font-style: italic; padding: 20px 0; }
        </style>
    </head>
    <body>
        <h1>Server Status</h1>
        
        <div id="actionMessage" style="display: none; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-weight: bold; text-align: center;"></div>
        
        <h2>Scheduled Cron Job</h2>
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <span class="title" style="margin: 0;">Next Scheduled Run:</span>
                <span class="details" style="font-weight: bold; color: var(--accent);">${nextSyncTime ? formatDate(nextSyncTime) : 'Pending'}</span>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; gap: 8px;">
                    <input type="datetime-local" id="newSyncTime" style="flex: 1; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: #2c2c2c; color: white; font-size: 1rem; color-scheme: dark;" />
                    <button class="btn" style="width: auto; margin: 0; padding: 10px 20px;" onclick="updateSyncTime()">Set</button>
                </div>
                <button class="btn" style="margin: 0; background: transparent; border: 1px solid var(--accent); color: var(--accent);" onclick="triggerSync()">Run Sync Now</button>
            </div>
        </div>
        
        <div id="sync-progress-container" style="display: none; background: rgba(187, 134, 252, 0.1); border: 1px solid var(--accent); padding: 16px; border-radius: 12px; margin-bottom: 24px;">
            <h3 style="color: var(--accent); margin-top: 0;">Sync in Progress</h3>
            <div id="sync-channel" class="title">Channel: -</div>
            <div id="sync-message" class="details" style="margin-bottom: 12px; font-style: italic;">Initializing...</div>
            <div style="background: #333; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 12px;">
                <div id="sync-bar" style="background: var(--accent); height: 100%; width: 0%; transition: width 0.3s ease;"></div>
            </div>
            <div class="stats-row" style="margin-top: 0; padding-top: 0; border: none; justify-content: space-between;">
                <span id="sync-progress" class="stat">0 / 0</span>
                <span id="sync-success" class="stat s">✓ 0</span>
                <span id="sync-error" class="stat e">✗ 0</span>
                <span id="sync-skipped" class="stat k">⏭ 0</span>
            </div>
            <div id="sync-title" class="details" style="margin-top: 12px; word-break: break-all;"></div>
        </div>

        <h2>Active Channels</h2>
        <div style="max-height: 400px; overflow-y: auto; padding-right: 8px;">
        ${channelConfig.length === 0 ? '<div class="empty">No channels configured.</div>' : channelConfig.map(ch => `
            <div class="card">
                <button class="btn-delete" onclick="deleteChannel('${encodeURIComponent(ch.channel)}')">Delete</button>
                <div class="title">${ch.channel.replace('https://www.youtube.com/', '').replace(/\/videos\/?$/, '')}</div>
                <div class="details">Last ID: ${ch.lastSongId || 'None'}</div>
                <div class="details">Last Sync: ${formatDate(ch.lastSongTimestamp)}</div>
                <div class="details">Last Download Count: ${ch.lastSyncCount !== undefined ? ch.lastSyncCount : 0}</div>
            </div>
        `).join('')}
        </div>

        <h2>Recent Requests</h2>
        <div style="max-height: 400px; overflow-y: auto; padding-right: 8px;">
        ${requestHistory.length === 0 ? '<div class="empty">No requests found.</div>' : requestHistory.map(req => `
            <div class="card">
                <div class="header-row">
                    <span class="badge ${req.type === 'worker' ? 'worker' : 'client'}">${req.type || 'unknown'}</span>
                    <span class="time">${formatDate(req.timestamp)}</span>
                </div>
                <div class="title">${req.url}</div>
                <div class="stats-row">
                    <span class="stat s">✓ ${req.success}</span>
                    <span class="stat e">✗ ${req.errors}</span>
                    <span class="stat k">⏭ ${req.skipped}</span>
                </div>
            </div>
        `).join('')}
        </div>

        <h2>Download Logs</h2>
        <div style="max-height: 400px; overflow-y: auto; padding-right: 8px;">
        ${downloadHistory.length === 0 ? '<div class="empty">No logs found.</div>' : downloadHistory.map(dl => `
            <div class="card">
                <div class="header-row">
                    <span class="badge ${dl.status === 'SUCCESS' ? 'success' : dl.status === 'ERROR' ? 'error' : 'warning'}">${dl.status}</span>
                    <span class="time">${formatDate(dl.timestamp)}</span>
                </div>
                <div class="title">${dl.title}</div>
                <div class="details">${dl.details}</div>
            </div>
        `).join('')}
        </div>

        <script>
            ${CLIENT_SCRIPT}
            var initialStatus = ${JSON.stringify(syncStatus || { isSyncing: false })};
            updateProgressUI(initialStatus);
        </script>
    </body>
    </html>
    `;
    
    res.send(html);
});

router.get("/json", async (req, res) => {
    res.json({
        requestHistory: await getFileContent("request_history"),
        channelConfig: await getFileContent("channel_config"),
        downloadHistory: await getFileContent("download_history"),
        syncStatus: await getFileContent("channel_sync_status")
    });
});

router.get("/trigger-sync", (req, res) => {
    console.log("[API] Triggered channel sync from public endpoint.");
    updateChannels().catch(err => console.error("[API] Channel update failed:", err));
    res.json({ success: true, message: "Channel auto-update started in the background." });
});

router.post("/update-sync-time", async (req, res) => {
    try {
        const { nextTime } = req.body;
        if (!nextTime) return res.status(400).json({ error: "Missing nextTime" });
        await AppDetail.findOneAndUpdate({ key: "next_daily_sync_time" }, { data: nextTime }, { upsert: true });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

router.post("/delete-channel", async (req, res) => {
    const { channel } = req.body;
    if (!channel) return res.status(400).json({ error: "Missing channel URL" });

    try {
        const doc = await AppDetail.findOne({ key: "channel_config" });
        if (doc && doc.data && Array.isArray(doc.data)) {
            const newData = doc.data.filter(c => c.channel !== channel);
            await AppDetail.findOneAndUpdate({ key: "channel_config" }, { data: newData });
        }

        const p = path.resolve(process.cwd(), "channel.json");
        if (fs.existsSync(p)) {
            const diskData = JSON.parse(fs.readFileSync(p, "utf-8"));
            if (Array.isArray(diskData)) {
                const newDiskData = diskData.filter(c => c.channel !== channel);
                fs.writeFileSync(p, JSON.stringify(newDiskData, null, 2));
            }
        }
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

export default router;
