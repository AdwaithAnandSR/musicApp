import express from "express";
import { updateChannels } from "../scripts/channelWorker.js";
import AppDetail from "../models/appDetails.js";
import Music from "../models/musics.js";
import User from "../models/users.js";

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

const getFileContent = async (key) => {
    try {
        const doc = await AppDetail.findOne({ key });
        let data = (doc && doc.data) ? doc.data : [];
        if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
            return data;
        }
        return [];
    } catch (e) {
        return [];
    }
};

const esc = (str) => {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
};

// ── SSE: Real-time Event Stream ──────────────────────────────────────────────

const sseClients = new Set();

router.get("/events", (req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
    });
    res.write(":\n\n"); // comment to establish connection

    sseClients.add(res);
    ensureTicker();
    req.on("close", () => sseClients.delete(res));
});

const broadcastSSE = (data) => {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
        try { client.write(payload); } catch (_) { sseClients.delete(client); }
    }
};

// Background ticker: pushes updates every 2s while there are connected clients
let tickerInterval = null;
const ensureTicker = () => {
    if (tickerInterval) return;
    tickerInterval = setInterval(async () => {
        if (sseClients.size === 0) {
            clearInterval(tickerInterval);
            tickerInterval = null;
            return;
        }
        try {
            const [requestHistory, syncStatus, downloadHistory] = await Promise.all([
                getFileContent("request_history"),
                getFileContent("channel_sync_status"),
                getFileContent("download_history"),
            ]);
            broadcastSSE({ requestHistory, syncStatus, downloadHistory });
        } catch (_) { /* ignore */ }
    }, 2000);
};

// ── CSS Styles ───────────────────────────────────────────────────────────────

const CSS = `
:root {
    --bg: #0a0a0f;
    --surface: rgba(255,255,255,0.04);
    --surface-hover: rgba(255,255,255,0.07);
    --glass: rgba(255,255,255,0.06);
    --glass-border: rgba(255,255,255,0.08);
    --text: #e8e8ed;
    --text-secondary: #8e8e93;
    --text-tertiary: #636366;
    --accent: #7c6aef;
    --accent-glow: rgba(124,106,239,0.15);
    --accent-subtle: rgba(124,106,239,0.08);
    --green: #30d158;
    --green-bg: rgba(48,209,88,0.12);
    --red: #ff453a;
    --red-bg: rgba(255,69,58,0.12);
    --orange: #ff9f0a;
    --orange-bg: rgba(255,159,10,0.12);
    --blue: #64d2ff;
    --blue-bg: rgba(100,210,255,0.12);
    --radius: 16px;
    --radius-sm: 10px;
    --radius-xs: 6px;
    --shadow: 0 8px 32px rgba(0,0,0,0.4);
    --transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
}
.bg-glow {
    position: fixed; top: -200px; left: 50%; transform: translateX(-50%);
    width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(124,106,239,0.08) 0%, transparent 70%);
    pointer-events: none; z-index: 0;
}
.container {
    max-width: 720px; margin: 0 auto;
    padding: 20px 16px 80px;
    position: relative; z-index: 1;
}

/* ── Header ── */
.page-header {
    text-align: center; padding: 32px 0 24px;
}
.page-header h1 {
    font-size: 1.75rem; font-weight: 700;
    background: linear-gradient(135deg, #e8e8ed 0%, #7c6aef 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text; letter-spacing: -0.02em;
}
.page-header .subtitle {
    font-size: 0.85rem; color: var(--text-tertiary); margin-top: 4px;
}
.live-dot {
    display: inline-block; width: 7px; height: 7px;
    background: var(--green); border-radius: 50%;
    margin-right: 6px; animation: pulse-dot 2s infinite;
    vertical-align: middle;
}
@keyframes pulse-dot {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(48,209,88,0.5); }
    50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(48,209,88,0); }
}

/* ── Stats Grid ── */
.stats-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 10px; margin-bottom: 24px;
}
.stat-card {
    background: var(--glass); border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm); padding: 16px 12px;
    text-align: center; backdrop-filter: blur(12px);
    transition: var(--transition);
}
.stat-card:hover { background: var(--surface-hover); transform: translateY(-1px); }
.stat-card .stat-value {
    font-size: 1.5rem; font-weight: 700; color: var(--text);
    font-variant-numeric: tabular-nums;
}
.stat-card .stat-label {
    font-size: 0.7rem; color: var(--text-tertiary);
    text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px;
}

/* ── Toast ── */
.toast {
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-100px);
    padding: 12px 24px; border-radius: var(--radius-sm);
    font-weight: 600; font-size: 0.85rem;
    box-shadow: var(--shadow); z-index: 9999;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    backdrop-filter: blur(20px); max-width: 90%;
}
.toast.show { transform: translateX(-50%) translateY(0); }
.toast.success { background: var(--green-bg); color: var(--green); border: 1px solid rgba(48,209,88,0.2); }
.toast.error { background: var(--red-bg); color: var(--red); border: 1px solid rgba(255,69,58,0.2); }

/* ── Section ── */
.section {
    margin-bottom: 20px;
}
.section-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 0; cursor: pointer; user-select: none;
}
.section-header h2 {
    font-size: 0.8rem; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--text-secondary);
}
.section-header .section-badge {
    font-size: 0.7rem; color: var(--text-tertiary);
    background: var(--surface); padding: 3px 10px;
    border-radius: 20px; font-variant-numeric: tabular-nums;
}
.section-content {
    overflow: hidden;
     transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
}
.section-content.collapsed { max-height: 0 !important; opacity: 0; }
.chevron {
    width: 16px; height: 16px; color: var(--text-tertiary);
    transition: transform 0.25s ease;
}
.section-header.collapsed .chevron { transform: rotate(-90deg); }

/* ── Cards ── */
.card {
    background: var(--glass); border: 1px solid var(--glass-border);
    border-radius: var(--radius); padding: 16px;
    margin-bottom: 10px; position: relative;
    backdrop-filter: blur(12px); transition: var(--transition);
}
.card:hover { background: var(--surface-hover); }
.card-accent { border-left: 3px solid var(--accent); }
.card-running { border: 1px solid rgba(255,159,10,0.3); background: var(--orange-bg); }

.card .card-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 8px; gap: 8px;
}
.card .card-title {
    font-size: 0.9rem; font-weight: 500; word-break: break-all;
}
.card .card-subtitle {
    font-size: 0.8rem; color: var(--text-secondary); word-break: break-all;
    font-style: italic;
}
.card .card-meta {
    font-size: 0.75rem; color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
}

/* ── Badges ── */
.badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 10px; border-radius: 20px;
    font-size: 0.68rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.04em;
    white-space: nowrap;
}
.badge-success { background: var(--green-bg); color: var(--green); }
.badge-error { background: var(--red-bg); color: var(--red); }
.badge-warning { background: var(--orange-bg); color: var(--orange); }
.badge-accent { background: var(--accent-subtle); color: var(--accent); }
.badge-blue { background: var(--blue-bg); color: var(--blue); }

/* ── Progress Bar ── */
.progress-track {
    height: 5px; background: rgba(255,255,255,0.06);
    border-radius: 3px; overflow: hidden; margin: 10px 0;
}
.progress-fill {
    height: 100%; border-radius: 3px;
    background: linear-gradient(90deg, var(--accent), #a78bfa);
    transition: width 0.4s ease;
}
.progress-fill.blue {
    background: linear-gradient(90deg, #64d2ff, #5ac8fa);
}

/* ── Stats Row ── */
.stats-inline {
    display: flex; gap: 14px; flex-wrap: wrap;
    padding-top: 10px; margin-top: 10px;
    border-top: 1px solid rgba(255,255,255,0.05);
}
.stats-inline .si { font-size: 0.8rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.stats-inline .si.green { color: var(--green); }
.stats-inline .si.red { color: var(--red); }
.stats-inline .si.orange { color: var(--orange); }
.stats-inline .si.muted { color: var(--text-tertiary); margin-left: auto; }

/* ── Sync Panel ── */
.sync-panel {
    background: var(--accent-glow); border: 1px solid rgba(124,106,239,0.2);
    border-radius: var(--radius); padding: 18px;
    margin-bottom: 16px; display: none;
    animation: slideDown 0.3s ease;
}
@keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
}
.sync-panel.visible { display: block; }
.sync-panel h3 {
    font-size: 0.85rem; font-weight: 600; color: var(--accent);
    margin-bottom: 10px; display: flex; align-items: center; gap: 8px;
}

/* ── Manual Tasks Panel ── */
.manual-panel {
    background: var(--blue-bg); border: 1px solid rgba(100,210,255,0.2);
    border-radius: var(--radius); padding: 18px;
    margin-bottom: 16px; display: none;
    animation: slideDown 0.3s ease;
}
.manual-panel.visible { display: block; }
.manual-panel h3 {
    font-size: 0.85rem; font-weight: 600; color: var(--blue);
    margin-bottom: 10px; display: flex; align-items: center; gap: 8px;
}

/* ── Cron Card ── */
.cron-card {
    background: var(--glass); border: 1px solid var(--glass-border);
    border-radius: var(--radius); padding: 18px;
    margin-bottom: 20px; backdrop-filter: blur(12px);
}
.cron-row {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 14px;
}
.cron-label { font-size: 0.8rem; color: var(--text-secondary); }
.cron-value { font-size: 0.85rem; color: var(--accent); font-weight: 600; }
.input-row { display: flex; gap: 8px; margin-bottom: 10px; }
input[type="datetime-local"], input[type="text"] {
    flex: 1; padding: 10px 14px; border-radius: var(--radius-xs);
    border: 1px solid var(--glass-border); background: rgba(255,255,255,0.04);
    color: var(--text); font-size: 0.85rem;
    outline: none; transition: var(--transition);
    color-scheme: dark;
}
input:focus { border-color: rgba(124,106,239,0.4); background: rgba(124,106,239,0.06); }
input::placeholder { color: var(--text-tertiary); }

/* ── Buttons ── */
.btn {
    padding: 10px 20px; border-radius: var(--radius-xs);
    font-weight: 600; font-size: 0.82rem; cursor: pointer;
    border: none; transition: var(--transition);
    display: inline-flex; align-items: center; gap: 6px;
}
.btn:active { transform: scale(0.97); }
.btn-primary {
    background: linear-gradient(135deg, var(--accent), #9b8afb);
    color: #fff; box-shadow: 0 4px 14px rgba(124,106,239,0.25);
}
.btn-primary:hover { box-shadow: 0 4px 20px rgba(124,106,239,0.4); }
.btn-outline {
    background: transparent; color: var(--accent);
    border: 1px solid rgba(124,106,239,0.3);
}
.btn-outline:hover { background: var(--accent-subtle); }
.btn-danger {
    background: transparent; color: var(--red);
    border: 1px solid rgba(255,69,58,0.3);
    font-size: 0.72rem; padding: 5px 12px;
}
.btn-danger:hover { background: var(--red-bg); }
.btn-block { width: 100%; justify-content: center; }

/* ── Links ── */
.back-link {
    display: inline-flex; align-items: center; gap: 6px;
    color: var(--accent); text-decoration: none; font-weight: 600;
    font-size: 0.85rem; margin-bottom: 20px;
    transition: var(--transition);
}
.back-link:hover { opacity: 0.8; }

/* ── Channel Card ── */
.ch-card {
    background: var(--glass); border: 1px solid var(--glass-border);
    border-radius: var(--radius); padding: 16px;
    margin-bottom: 10px; position: relative;
    backdrop-filter: blur(12px); transition: var(--transition);
}
.ch-card:hover { background: var(--surface-hover); }
.ch-meta { font-size: 0.78rem; color: var(--text-tertiary); margin-top: 6px; }
.filter-group { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.05); }
.filter-label {
    font-size: 0.72rem; color: var(--text-tertiary);
    text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;
}
.filter-actions { display: flex; gap: 8px; margin-top: 10px; }

/* ── Empty State ── */
.empty {
    text-align: center; color: var(--text-tertiary);
    font-style: italic; padding: 32px 0; font-size: 0.85rem;
}

/* ── Scrollable List ── */
.scroll-list { max-height: 450px; overflow-y: auto; padding-right: 4px; }
.scroll-list::-webkit-scrollbar { width: 4px; }
.scroll-list::-webkit-scrollbar-track { background: transparent; }
.scroll-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

/* ── Connection Status ── */
.conn-status {
    position: fixed; bottom: 16px; right: 16px;
    padding: 8px 14px; border-radius: 20px;
    font-size: 0.72rem; font-weight: 600;
    backdrop-filter: blur(20px); z-index: 999;
    transition: var(--transition);
}
.conn-status.connected { background: var(--green-bg); color: var(--green); border: 1px solid rgba(48,209,88,0.2); }
.conn-status.disconnected { background: var(--red-bg); color: var(--red); border: 1px solid rgba(255,69,58,0.2); }

@media (max-width: 480px) {
    .container { padding: 12px 10px 60px; }
    .stats-grid { grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .stat-card { padding: 12px 8px; }
    .stat-card .stat-value { font-size: 1.2rem; }
}
`;

// ── Client-side JS ───────────────────────────────────────────────────────────

const CLIENT_JS = `
// ── Utilities ──
function formatTime(isoStr) {
    if (!isoStr) return 'N/A';
    var d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var h = d.getHours(), m = d.getMinutes().toString().padStart(2,'0');
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + h + ':' + m + ' ' + ampm;
}

function escHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = String(s);
    return div.innerHTML;
}

function showToast(msg, isError) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast ' + (isError ? 'error' : 'success') + ' show';
    clearTimeout(t._tid);
    t._tid = setTimeout(function() { t.classList.remove('show'); }, 3500);
}

// ── Format all time elements ──
function formatAllTimes() {
    document.querySelectorAll('.fmt-time').forEach(function(el) {
        var iso = el.getAttribute('data-iso');
        if (iso) el.textContent = formatTime(iso);
    });
}

// ── Section toggle ──
document.querySelectorAll('.section-header').forEach(function(h) {
    h.addEventListener('click', function() {
        var content = h.nextElementSibling;
        h.classList.toggle('collapsed');
        content.classList.toggle('collapsed');
    });
});

// ── SSE Real-time connection ──
var connEl = document.getElementById('conn-status');
var evtSource = null;

function connectSSE() {
    if (evtSource) { try { evtSource.close(); } catch(_) {} }
    evtSource = new EventSource('/status/events');

    evtSource.onopen = function() {
        connEl.textContent = '● Live';
        connEl.className = 'conn-status connected';
    };

    evtSource.onmessage = function(e) {
        try {
            var data = JSON.parse(e.data);
            updateSyncPanel(data.syncStatus);
            updateManualTasks(data.requestHistory);
            updateRecentRequests(data.requestHistory);
            updateDownloadLogs(data.downloadHistory);
        } catch(_) {}
    };

    evtSource.onerror = function() {
        connEl.textContent = '● Reconnecting…';
        connEl.className = 'conn-status disconnected';
        evtSource.close();
        setTimeout(connectSSE, 3000);
    };
}
connectSSE();

// ── Sync Progress Panel ──
function updateSyncPanel(status) {
    var panel = document.getElementById('sync-panel');
    if (!status || !status.isSyncing) {
        panel.classList.remove('visible');
        return;
    }
    panel.classList.add('visible');
    var ch = status.currentChannel || '...';
    ch = ch.replace(/\\/videos\\/?$/, '');
    document.getElementById('sp-channel').textContent = ch;
    document.getElementById('sp-message').textContent = status.message || 'Processing...';

    var total = status.totalSongs || 0, cur = status.currentSongIndex || 0;
    document.getElementById('sp-progress').textContent = cur + ' / ' + total;
    var pct = total > 0 ? Math.min(100, Math.round((cur / total) * 100)) : 0;
    document.getElementById('sp-bar').style.width = pct + '%';
    document.getElementById('sp-ok').textContent = '✓ ' + (status.successCount || 0);
    document.getElementById('sp-err').textContent = '✗ ' + (status.errorCount || 0);
    document.getElementById('sp-skip').textContent = '⏭ ' + (status.skippedCount || 0);
    document.getElementById('sp-title').textContent = status.currentSongTitle || '...';
}

// ── Manual Tasks Panel ──
function updateManualTasks(history) {
    var panel = document.getElementById('manual-panel');
    var list = document.getElementById('manual-list');
    var running = (history || []).filter(function(r) { return r.status === 'RUNNING'; });
    if (running.length === 0) { panel.classList.remove('visible'); return; }
    panel.classList.add('visible');

    var html = '';
    running.forEach(function(req) {
        var total = req.limit || 0;
        var done = (req.success||0) + (req.errors||0) + (req.skipped||0);
        var pct = total > 0 ? Math.min(100, Math.round((done/total)*100)) : 0;
        html += '<div style="margin-bottom:12px">';
        html += '<div class="card-title">' + escHtml(req.url) + '</div>';
        html += '<div class="card-subtitle" style="margin:4px 0">Current: ' + escHtml(req.currentTitle||'...') + '</div>';
        html += '<div class="progress-track"><div class="progress-fill blue" style="width:' + pct + '%"></div></div>';
        html += '<div class="stats-inline" style="border:none;margin:0;padding:0">';
        html += '<span class="si green">✓ ' + (req.success||0) + '</span>';
        html += '<span class="si red">✗ ' + (req.errors||0) + '</span>';
        html += '<span class="si orange">⏭ ' + (req.skipped||0) + '</span>';
        if (total > 0) html += '<span class="si muted">' + done + '/' + total + '</span>';
        html += '</div></div>';
    });
    list.innerHTML = html;
}

// ── Recent Requests ──
function updateRecentRequests(history) {
    var el = document.getElementById('requests-list');
    var badge = document.getElementById('requests-badge');
    if (!history || history.length === 0) {
        el.innerHTML = '<div class="empty">No requests yet</div>';
        badge.textContent = '0';
        return;
    }
    badge.textContent = history.length;
    var html = '';
    history.forEach(function(req) {
        var isRunning = req.status === 'RUNNING';
        var total = req.limit || 0;
        var done = (req.success||0) + (req.errors||0) + (req.skipped||0);
        var left = Math.max(0, total - done);
        var dur = '';
        if (!isRunning && req.timestamp && req.completedAt && req.type === 'worker') {
            var ds = Math.floor((new Date(req.completedAt) - new Date(req.timestamp)) / 1000);
            if (ds >= 0) dur = ' (' + Math.floor(ds/60) + 'm ' + (ds%60) + 's)';
        }
        html += '<div class="card' + (isRunning?' card-running':'') + '">';
        html += '<div class="card-header">';
        html += '<div style="display:flex;gap:6px;flex-wrap:wrap">';
        html += '<span class="badge ' + (req.type==='worker'?'badge-accent':'badge-blue') + '">' + escHtml(req.type||'unknown') + '</span>';
        html += '<span class="badge ' + (isRunning?'badge-warning':'badge-success') + '">' + escHtml(req.status||'COMPLETED') + escHtml(dur) + '</span>';
        html += '</div>';
        html += '<span class="card-meta">' + formatTime(req.timestamp) + '</span>';
        html += '</div>';
        html += '<div class="card-title">' + escHtml(req.url) + '</div>';
        if (req.currentTitle) html += '<div class="card-subtitle" style="margin-top:6px">Current: ' + escHtml(req.currentTitle) + '</div>';
        html += '<div class="stats-inline">';
        html += '<span class="si green">✓ ' + (req.success||0) + '</span>';
        html += '<span class="si red">✗ ' + (req.errors||0) + '</span>';
        html += '<span class="si orange">⏭ ' + (req.skipped||0) + '</span>';
        if (total > 0) html += '<span class="si muted">' + done + '/' + total + ' · ' + left + ' left</span>';
        html += '</div>';
        if (!isRunning) html += '<button class="btn btn-danger" style="position:absolute;top:14px;right:14px" onclick="deleteReq(\\'' + escHtml(req.id) + '\\')">Delete</button>';
        html += '</div>';
    });
    el.innerHTML = html;
}

// ── Download Logs ──
function updateDownloadLogs(history) {
    var el = document.getElementById('downloads-list');
    var badge = document.getElementById('downloads-badge');
    if (!history || history.length === 0) {
        el.innerHTML = '<div class="empty">No download logs</div>';
        badge.textContent = '0';
        return;
    }
    badge.textContent = history.length;
    var html = '';
    history.forEach(function(dl) {
        var bc = dl.status==='SUCCESS' ? 'badge-success' : (dl.status==='ERROR' ? 'badge-error' : 'badge-warning');
        html += '<div class="card">';
        html += '<div class="card-header">';
        html += '<span class="badge ' + bc + '">' + escHtml(dl.status||'') + '</span>';
        html += '<span class="card-meta">' + formatTime(dl.timestamp) + '</span>';
        html += '</div>';
        html += '<div class="card-title">' + escHtml(dl.title||'') + '</div>';
        if (dl.details) html += '<div class="card-subtitle" style="margin-top:4px">' + escHtml(dl.details) + '</div>';
        html += '</div>';
    });
    el.innerHTML = html;
}

// ── Actions ──
function deleteReq(id) {
    if (!confirm('Delete this request log?')) return;
    showToast('Deleting…');
    fetch('/status/delete-request', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({id:id})
    }).then(function(r){return r.json()}).then(function(d){
        if(d.success) showToast('Deleted');
        else showToast('Failed: '+d.error, true);
    }).catch(function(){showToast('Network error',true)});
}

function triggerSync() {
    showToast('Sync triggered!');
    fetch('/status/trigger-sync').then(function(r){return r.json()}).then(function(d){
        console.log(d);
    }).catch(function(){showToast('Failed to trigger sync',true)});
}

function updateSyncTime() {
    var v = document.getElementById('newSyncTime').value;
    if (!v) return showToast('Select a time first', true);
    var ms = new Date(v).getTime();
    if (isNaN(ms)) return showToast('Invalid time', true);
    fetch('/status/update-sync-time', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({nextTime:ms})
    }).then(function(r){return r.json()}).then(function(d){
        if(d.success) { showToast('Sync time updated!'); setTimeout(function(){location.reload()},1500); }
        else showToast('Failed: '+d.error, true);
    }).catch(function(){showToast('Network error',true)});
}
`;

// ── Main Status Page ─────────────────────────────────────────────────────────

router.get("/", async (req, res) => {
    try {
        const [downloadHistory, requestHistory, channelConfig, syncStatus, songCount, userCount] = await Promise.all([
            getFileContent("download_history"),
            getFileContent("request_history"),
            getFileContent("channel_config"),
            getFileContent("channel_sync_status"),
            Music.countDocuments().catch(() => 0),
            User.countDocuments().catch(() => 0),
        ]);

        const nextSyncDoc = await AppDetail.findOne({ key: "next_daily_sync_time" });
        let nextSyncTime = nextSyncDoc && nextSyncDoc.data ? new Date(Number(nextSyncDoc.data)).toISOString() : null;

        if (!nextSyncTime) {
            const lastSyncDoc = await AppDetail.findOne({ key: "last_daily_sync_time" });
            const lastSyncTime = lastSyncDoc && lastSyncDoc.data ? Number(lastSyncDoc.data) : null;
            if (lastSyncTime) {
                nextSyncTime = new Date(lastSyncTime + 24 * 60 * 60 * 1000).toISOString();
            }
        }

        const channelCount = Array.isArray(channelConfig) ? channelConfig.length : 0;
        const requestCount = Array.isArray(requestHistory) ? requestHistory.length : 0;
        const downloadCount = Array.isArray(downloadHistory) ? downloadHistory.length : 0;

        const initialSyncJSON = JSON.stringify(syncStatus && typeof syncStatus === "object" ? syncStatus : { isSyncing: false });
        const initialRequestsJSON = JSON.stringify(Array.isArray(requestHistory) ? requestHistory : []);
        const initialDownloadsJSON = JSON.stringify(Array.isArray(downloadHistory) ? downloadHistory : []);

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Server Status</title>
    <style>${CSS}</style>
</head>
<body>
    <div class="bg-glow"></div>
    <div id="toast" class="toast"></div>

    <div class="container">
        <div class="page-header">
            <h1>Server Status</h1>
            <div class="subtitle"><span class="live-dot"></span>Real-time Dashboard</div>
        </div>

        <!-- Stats -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value" id="stat-songs">${songCount.toLocaleString()}</div>
                <div class="stat-label">Songs</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${userCount.toLocaleString()}</div>
                <div class="stat-label">Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${channelCount}</div>
                <div class="stat-label">Channels</div>
            </div>
        </div>

        <!-- Sync Progress Panel (hidden by default) -->
        <div id="sync-panel" class="sync-panel">
            <h3><span class="live-dot"></span>Sync in Progress</h3>
            <div class="card-title" id="sp-channel">Channel: —</div>
            <div class="card-subtitle" id="sp-message" style="margin:6px 0">Initializing…</div>
            <div class="progress-track"><div class="progress-fill" id="sp-bar" style="width:0%"></div></div>
            <div class="stats-inline" style="border:none;margin:0;padding:0;justify-content:space-between">
                <span class="si" id="sp-progress" style="color:var(--text-secondary)">0/0</span>
                <span class="si green" id="sp-ok">✓ 0</span>
                <span class="si red" id="sp-err">✗ 0</span>
                <span class="si orange" id="sp-skip">⏭ 0</span>
            </div>
            <div class="card-subtitle" id="sp-title" style="margin-top:10px"></div>
        </div>

        <!-- Manual Tasks Panel (hidden by default) -->
        <div id="manual-panel" class="manual-panel">
            <h3><span class="live-dot" style="background:var(--blue)"></span>Active Manual Tasks</h3>
            <div id="manual-list"></div>
        </div>

        <!-- Cron Job -->
        <div class="section">
            <div class="section-header">
                <h2>Scheduled Sync</h2>
                <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="section-content">
                <div class="cron-card">
                    <div class="cron-row">
                        <span class="cron-label">Next Run</span>
                        <span class="cron-value fmt-time" data-iso="${esc(nextSyncTime || "")}">${nextSyncTime ? esc(nextSyncTime) : "Pending"}</span>
                    </div>
                    <div class="input-row">
                        <input type="datetime-local" id="newSyncTime" />
                        <button class="btn btn-primary" onclick="updateSyncTime()">Set</button>
                    </div>
                    <button class="btn btn-outline btn-block" onclick="triggerSync()">Run Sync Now</button>
                </div>
            </div>
        </div>

        <!-- Active Channels -->
        <div class="section">
            <div class="section-header">
                <h2>Active Channels</h2>
                <div style="display:flex;align-items:center;gap:8px">
                    <span class="section-badge">${channelCount}</span>
                    <a href="/status/channels" class="btn btn-outline" style="padding:5px 14px;font-size:0.72rem">Manage</a>
                </div>
            </div>
            <div class="section-content collapsed" style="max-height:0;opacity:0">
                ${channelCount === 0 ? '<div class="empty">No channels configured</div>' :
                    channelConfig.map(ch => {
                        const name = ch.channel.replace("https://www.youtube.com/", "").replace(/\/videos\/?$/, "");
                        return `<div class="card">
                            <div class="card-title">${esc(name)}</div>
                            <div class="ch-meta">Last Sync: <span class="fmt-time" data-iso="${esc(ch.lastSongTimestamp || "")}">${esc(ch.lastSongTimestamp || "N/A")}</span> · Downloads: ${ch.lastSyncCount !== undefined ? ch.lastSyncCount : 0}</div>
                        </div>`;
                    }).join("")}
            </div>
        </div>

        <!-- Recent Requests -->
        <div class="section">
            <div class="section-header">
                <h2>Recent Requests</h2>
                <span class="section-badge" id="requests-badge">${requestCount}</span>
            </div>
            <div class="section-content">
                <div class="scroll-list" id="requests-list">
                    ${requestCount === 0 ? '<div class="empty">No requests yet</div>' :
                        requestHistory.map(req => {
                            const isRunning = req.status === "RUNNING";
                            const total = req.limit || 0;
                            const done = (req.success || 0) + (req.errors || 0) + (req.skipped || 0);
                            const left = Math.max(0, total - done);
                            let dur = "";
                            if (!isRunning && req.timestamp && req.completedAt && req.type === "worker") {
                                const ds = Math.floor((new Date(req.completedAt) - new Date(req.timestamp)) / 1000);
                                if (ds >= 0) dur = ` (${Math.floor(ds / 60)}m ${ds % 60}s)`;
                            }
                            return `<div class="card${isRunning ? " card-running" : ""}">
                                <div class="card-header">
                                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                                        <span class="badge ${req.type === "worker" ? "badge-accent" : "badge-blue"}">${esc(req.type || "unknown")}</span>
                                        <span class="badge ${isRunning ? "badge-warning" : "badge-success"}">${esc(req.status || "COMPLETED")}${esc(dur)}</span>
                                    </div>
                                    <span class="card-meta fmt-time" data-iso="${esc(req.timestamp)}">${esc(req.timestamp || "N/A")}</span>
                                </div>
                                <div class="card-title">${esc(req.url)}</div>
                                ${req.currentTitle ? `<div class="card-subtitle" style="margin-top:6px">Current: ${esc(req.currentTitle)}</div>` : ""}
                                <div class="stats-inline">
                                    <span class="si green">✓ ${req.success || 0}</span>
                                    <span class="si red">✗ ${req.errors || 0}</span>
                                    <span class="si orange">⏭ ${req.skipped || 0}</span>
                                    ${total > 0 ? `<span class="si muted">${done}/${total} · ${left} left</span>` : ""}
                                </div>
                                ${!isRunning ? `<button class="btn btn-danger" style="position:absolute;top:14px;right:14px" onclick="deleteReq('${esc(req.id)}')">Delete</button>` : ""}
                            </div>`;
                        }).join("")}
                </div>
            </div>
        </div>

        <!-- Download Logs -->
        <div class="section">
            <div class="section-header">
                <h2>Download Logs</h2>
                <span class="section-badge" id="downloads-badge">${downloadCount}</span>
            </div>
            <div class="section-content">
                <div class="scroll-list" id="downloads-list">
                    ${downloadCount === 0 ? '<div class="empty">No download logs</div>' :
                        downloadHistory.map(dl => {
                            const bc = dl.status === "SUCCESS" ? "badge-success" : (dl.status === "ERROR" ? "badge-error" : "badge-warning");
                            return `<div class="card">
                                <div class="card-header">
                                    <span class="badge ${bc}">${esc(dl.status)}</span>
                                    <span class="card-meta fmt-time" data-iso="${esc(dl.timestamp)}">${esc(dl.timestamp || "N/A")}</span>
                                </div>
                                <div class="card-title">${esc(dl.title)}</div>
                                ${dl.details ? `<div class="card-subtitle" style="margin-top:4px">${esc(dl.details)}</div>` : ""}
                            </div>`;
                        }).join("")}
                </div>
            </div>
        </div>
    </div>

    <div id="conn-status" class="conn-status disconnected">● Connecting…</div>

    <script>
        ${CLIENT_JS}
        // Initialize with SSR data
        formatAllTimes();
        updateSyncPanel(${initialSyncJSON});
        updateManualTasks(${initialRequestsJSON});
    </script>
</body>
</html>`;

        res.send(html);
    } catch (err) {
        console.error("[Status Page Error]", err);
        res.status(500).send(`<h1>Error loading status page</h1><pre>${esc(err.message)}</pre>`);
    }
});

// ── Manage Channels Page ─────────────────────────────────────────────────────

router.get("/channels", async (req, res) => {
    try {
        const channelConfig = await getFileContent("channel_config") || [];

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Manage Channels</title>
    <style>${CSS}</style>
</head>
<body>
    <div class="bg-glow"></div>
    <div id="toast" class="toast"></div>

    <div class="container">
        <a href="/status" class="back-link">← Back to Status</a>
        <div class="page-header" style="padding-top:8px">
            <h1>Manage Channels</h1>
            <div class="subtitle">${channelConfig.length} channel${channelConfig.length !== 1 ? "s" : ""} configured</div>
        </div>

        <!-- Add Channel -->
        <div class="cron-card" style="margin-bottom:24px">
            <div class="input-row">
                <input type="text" id="newChannelUrl" placeholder="https://youtube.com/@channel/videos" />
                <button class="btn btn-primary" onclick="addChannel()">Add</button>
            </div>
        </div>

        <!-- Channel List -->
        <div id="channel-list">
        ${channelConfig.length === 0 ? '<div class="empty">No channels configured</div>' :
            channelConfig.map((ch, i) => {
                const name = ch.channel.replace("https://www.youtube.com/", "").replace(/\/videos\/?$/, "");
                return `<div class="ch-card">
                    <button class="btn btn-danger" style="position:absolute;top:14px;right:14px" onclick="deleteChannel('${encodeURIComponent(ch.channel)}')">Remove</button>
                    <div class="card-title">${esc(name)}</div>
                    <div class="ch-meta" style="display:flex;align-items:center;gap:8px;margin-top:8px;margin-bottom:4px">
                        <span>Last ID:</span>
                        <input type="text" id="lastId-${i}" value="${esc(ch.lastSongId || "")}" placeholder="None" style="font-size:0.78rem;padding:6px 10px" />
                        <button class="btn btn-outline" style="padding:6px 14px;font-size:0.72rem" onclick="updateLastId('${encodeURIComponent(ch.channel)}',${i})">Save</button>
                    </div>
                    <div class="ch-meta">Last Sync: <span class="fmt-time" data-iso="${esc(ch.lastSongTimestamp || "")}">${esc(ch.lastSongTimestamp || "N/A")}</span></div>
                    <div class="ch-meta">Downloads: ${ch.lastSyncCount !== undefined ? ch.lastSyncCount : 0}</div>
                    <div class="filter-group">
                        <div class="filter-label">Exclude (comma separated)</div>
                        <input type="text" id="exclude-${i}" value="${esc((ch.exclude || []).join(", "))}" style="width:100%;margin-bottom:8px;font-size:0.82rem;padding:8px 12px" />
                        <div class="filter-label">Include (comma separated)</div>
                        <input type="text" id="include-${i}" value="${esc((ch.include || []).join(", "))}" style="width:100%;font-size:0.82rem;padding:8px 12px" />
                        <div class="filter-actions">
                            <button class="btn btn-outline" style="flex:1;font-size:0.78rem;padding:8px" onclick="applyFilters('${encodeURIComponent(ch.channel)}',${i})">Apply</button>
                            <button class="btn btn-primary" style="flex:1;font-size:0.78rem;padding:8px" onclick="applyAllFilters(${i})">Apply to All</button>
                        </div>
                    </div>
                </div>`;
            }).join("")}
        </div>
    </div>

    <script>
        function escHtml(s) { if(s==null)return''; var d=document.createElement('div'); d.textContent=String(s); return d.innerHTML; }
        function showToast(msg,isError) {
            var t=document.getElementById('toast');
            t.textContent=msg; t.className='toast '+(isError?'error':'success')+' show';
            clearTimeout(t._tid); t._tid=setTimeout(function(){t.classList.remove('show')},3500);
        }
        function formatAllTimes() {
            document.querySelectorAll('.fmt-time').forEach(function(el) {
                var iso = el.getAttribute('data-iso');
                if (!iso) return;
                var d = new Date(iso);
                if (isNaN(d.getTime())) return;
                var months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                var h=d.getHours(),m=d.getMinutes().toString().padStart(2,'0');
                var ampm=h>=12?'PM':'AM'; h=h%12||12;
                el.textContent=months[d.getMonth()]+' '+d.getDate()+', '+h+':'+m+' '+ampm;
            });
        }
        formatAllTimes();

        function apiCall(url, body) {
            return fetch(url, {
                method:'POST', headers:{'Content-Type':'application/json'},
                body:JSON.stringify(body)
            }).then(function(r){return r.json()});
        }

        function deleteChannel(enc) {
            if(!confirm('Remove this channel?'))return;
            showToast('Removing…');
            apiCall('/status/delete-channel',{channel:decodeURIComponent(enc)}).then(function(d){
                if(d.success){showToast('Removed');setTimeout(function(){location.reload()},1200);}
                else showToast('Failed: '+d.error,true);
            }).catch(function(){showToast('Network error',true)});
        }

        function addChannel() {
            var v=document.getElementById('newChannelUrl').value;
            if(!v)return showToast('Enter a channel URL',true);
            showToast('Adding…');
            apiCall('/status/add-channel',{channel:v}).then(function(d){
                if(d.success){showToast('Added');setTimeout(function(){location.reload()},1200);}
                else showToast('Failed: '+d.error,true);
            }).catch(function(){showToast('Network error',true)});
        }

        function updateLastId(enc,idx) {
            var v=document.getElementById('lastId-'+idx).value.trim();
            showToast('Saving…');
            apiCall('/status/update-last-id',{channel:decodeURIComponent(enc),lastSongId:v}).then(function(d){
                if(d.success) showToast('Saved');
                else showToast('Failed: '+d.error,true);
            }).catch(function(){showToast('Network error',true)});
        }

        function getFilters(idx) {
            var ex=document.getElementById('exclude-'+idx).value;
            var inc=document.getElementById('include-'+idx).value;
            return {
                exclude:ex.split(',').map(function(s){return s.trim()}).filter(Boolean),
                include:inc.split(',').map(function(s){return s.trim()}).filter(Boolean)
            };
        }

        function applyFilters(enc,idx) {
            var f=getFilters(idx);
            showToast('Updating filters…');
            apiCall('/status/update-filters',{channel:decodeURIComponent(enc),exclude:f.exclude,include:f.include}).then(function(d){
                if(d.success) showToast('Filters updated');
                else showToast('Failed: '+d.error,true);
            }).catch(function(){showToast('Network error',true)});
        }

        function applyAllFilters(idx) {
            if(!confirm('Apply these filters to ALL channels?'))return;
            var f=getFilters(idx);
            showToast('Updating all filters…');
            apiCall('/status/update-all-filters',{exclude:f.exclude,include:f.include}).then(function(d){
                if(d.success){showToast('Applied to all');setTimeout(function(){location.reload()},1200);}
                else showToast('Failed: '+d.error,true);
            }).catch(function(){showToast('Network error',true)});
        }
    </script>
</body>
</html>`;

        res.send(html);
    } catch (err) {
        console.error("[Channels Page Error]", err);
        res.status(500).send(`<h1>Error loading channels page</h1><pre>${esc(err.message)}</pre>`);
    }
});

// ── JSON API ─────────────────────────────────────────────────────────────────

router.get("/json", async (req, res) => {
    try {
        const [requestHistory, channelConfig, downloadHistory, syncStatus] = await Promise.all([
            getFileContent("request_history"),
            getFileContent("channel_config"),
            getFileContent("download_history"),
            getFileContent("channel_sync_status"),
        ]);
        res.json({ requestHistory, channelConfig, downloadHistory, syncStatus });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Mutation Endpoints ───────────────────────────────────────────────────────

router.post("/delete-request", async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Missing request ID" });
    try {
        const doc = await AppDetail.findOne({ key: "request_history" });
        if (doc && doc.data && Array.isArray(doc.data)) {
            const newData = doc.data.filter(r => r.id !== id);
            await AppDetail.findOneAndUpdate({ key: "request_history" }, { data: newData });
        }
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

router.get("/trigger-sync", (req, res) => {
    console.log("[API] Triggered channel sync from status page.");
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
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

router.post("/add-channel", async (req, res) => {
    const { channel } = req.body;
    if (!channel) return res.status(400).json({ error: "Missing channel URL" });
    try {
        const doc = await AppDetail.findOne({ key: "channel_config" });
        let channels = (doc && doc.data && Array.isArray(doc.data)) ? doc.data : [];
        if (!channels.some(c => c.channel === channel)) {
            channels.push({ channel, lastSongId: "", lastSongTimestamp: "", exclude: [], include: [] });
            await AppDetail.findOneAndUpdate({ key: "channel_config" }, { data: channels }, { upsert: true });
        }
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

router.post("/update-filters", async (req, res) => {
    const { channel, exclude, include } = req.body;
    if (!channel) return res.status(400).json({ error: "Missing channel URL" });
    try {
        const doc = await AppDetail.findOne({ key: "channel_config" });
        if (doc && doc.data && Array.isArray(doc.data)) {
            const channels = doc.data;
            const idx = channels.findIndex(c => c.channel === channel);
            if (idx !== -1) {
                channels[idx].exclude = exclude || [];
                channels[idx].include = include || [];
                await AppDetail.findOneAndUpdate({ key: "channel_config" }, { data: channels });
            }
        }
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

router.post("/update-all-filters", async (req, res) => {
    const { exclude, include } = req.body;
    try {
        const doc = await AppDetail.findOne({ key: "channel_config" });
        if (doc && doc.data && Array.isArray(doc.data)) {
            const channels = doc.data;
            channels.forEach(ch => {
                ch.exclude = exclude || [];
                ch.include = include || [];
            });
            await AppDetail.findOneAndUpdate({ key: "channel_config" }, { data: channels });
        }
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

router.post("/update-last-id", async (req, res) => {
    const { channel, lastSongId } = req.body;
    if (!channel) return res.status(400).json({ error: "Missing channel URL" });
    try {
        const doc = await AppDetail.findOne({ key: "channel_config" });
        if (doc && doc.data && Array.isArray(doc.data)) {
            const channels = doc.data;
            const idx = channels.findIndex(c => c.channel === channel);
            if (idx !== -1) {
                channels[idx].lastSongId = lastSongId || "";
                await AppDetail.findOneAndUpdate({ key: "channel_config" }, { data: channels });
            }
        }
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

export default router;
