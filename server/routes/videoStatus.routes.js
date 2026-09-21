import express from "express";
import AppDetail from "../models/appDetails.js";
import Music from "../models/musics.js";
import { getVideoCloudinaryUsage, isVideoDownloadBlocked } from "../utils/videoCredits.js";

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

const getFileContent = async key => {
    try {
        const doc = await AppDetail.findOne({ key });
        let data = doc && doc.data ? doc.data : [];
        if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
            return data;
        }
        return [];
    } catch (e) {
        return [];
    }
};

const esc = str => {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
};

// ── SSE for Video Status ─────────────────────────────────────────────────────

const videoSseClients = new Set();

router.get("/events", (req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
    });
    res.write(":\n\n");
    videoSseClients.add(res);
    ensureVideoTicker();
    req.on("close", () => videoSseClients.delete(res));
});

const broadcastVideoSSE = data => {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of videoSseClients) {
        try { client.write(payload); } catch (_) { videoSseClients.delete(client); }
    }
};

let videoTickerInterval = null;
const ensureVideoTicker = () => {
    if (videoTickerInterval) return;
    videoTickerInterval = setInterval(async () => {
        if (videoSseClients.size === 0) {
            clearInterval(videoTickerInterval);
            videoTickerInterval = null;
            return;
        }
        try {
            const [syncStatus, downloadHistory] = await Promise.all([
                getFileContent("video_sync_status"),
                getFileContent("video_download_history")
            ]);
            broadcastVideoSSE({ syncStatus, downloadHistory });
        } catch (_) {}
    }, 2000);
};

// ── CSS (reuses the same design system) ──────────────────────────────────────

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
    --purple: #bf5af2;
    --purple-bg: rgba(191,90,242,0.12);
    --radius: 16px;
    --radius-sm: 10px;
    --radius-xs: 6px;
    --shadow: 0 8px 32px rgba(0,0,0,0.4);
    --transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
    background: var(--bg); color: var(--text); line-height: 1.6;
    min-height: 100vh; -webkit-font-smoothing: antialiased;
}
.bg-glow {
    position: fixed; top: -200px; left: 50%; transform: translateX(-50%);
    width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(191,90,242,0.08) 0%, transparent 70%);
    pointer-events: none; z-index: 0;
}
.container {
    max-width: 720px; margin: 0 auto;
    padding: 20px 16px 80px; position: relative; z-index: 1;
}
.page-header { text-align: center; padding: 32px 0 24px; }
.page-header h1 {
    font-size: 1.75rem; font-weight: 700;
    background: linear-gradient(135deg, #e8e8ed 0%, #bf5af2 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text; letter-spacing: -0.02em;
}
.page-header .subtitle {
    font-size: 0.85rem; color: var(--text-tertiary); margin-top: 4px;
}
.live-dot {
    display: inline-block; width: 7px; height: 7px;
    background: var(--green); border-radius: 50%;
    margin-right: 6px; animation: pulse-dot 2s infinite; vertical-align: middle;
}
@keyframes pulse-dot {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(48,209,88,0.5); }
    50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(48,209,88,0); }
}
.stats-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 10px; margin-bottom: 24px;
}
.stat-card {
    background: var(--glass); border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm); padding: 16px 12px;
    text-align: center; backdrop-filter: blur(12px); transition: var(--transition);
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
.section { margin-bottom: 20px; }
.section-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px; user-select: none; cursor: pointer;
}
.section-header h2 {
    font-size: 0.8rem; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary);
}
.section-header .section-badge {
    font-size: 0.7rem; color: var(--text-tertiary);
    background: var(--surface); padding: 3px 10px;
    border-radius: 20px; font-variant-numeric: tabular-nums;
}
.section-content {
    overflow: hidden;
    transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, padding 0.3s ease;
    opacity: 1;
}
.section-content.collapsed { max-height: 0 !important; opacity: 0; padding-top: 0; padding-bottom: 0; }
.chevron {
    width: 16px; height: 16px; color: var(--text-tertiary);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); flex-shrink: 0;
}
.section-header.collapsed .chevron { transform: rotate(-90deg); }
.card {
    background: var(--glass); border: 1px solid var(--glass-border);
    border-radius: var(--radius); padding: 16px;
    margin-bottom: 10px; position: relative;
    backdrop-filter: blur(12px); transition: var(--transition);
}
.card-running { border: 1px solid rgba(255,159,10,0.3); background: var(--orange-bg); }
.card .card-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 8px; gap: 8px;
}
.card-title { font-size: 0.8rem; font-weight: 500; word-break: break-all; }
.card-subtitle { font-size: 0.78rem; color: var(--text-secondary); word-break: break-all; font-style: italic; }
.card .card-meta {
    font-size: 0.75rem; color: var(--text-tertiary);
    font-variant-numeric: tabular-nums; white-space: nowrap;
}
.badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 10px; border-radius: 20px;
    font-size: 0.68rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap;
}
.badge-success { background: var(--green-bg); color: var(--green); }
.badge-error { background: var(--red-bg); color: var(--red); }
.badge-warning { background: var(--orange-bg); color: var(--orange); }
.badge-accent { background: var(--accent-subtle); color: var(--accent); }
.badge-blue { background: var(--blue-bg); color: var(--blue); }
.badge-purple { background: var(--purple-bg); color: var(--purple); }
.progress-track {
    height: 5px; background: rgba(255,255,255,0.06);
    border-radius: 3px; overflow: hidden; margin: 10px 0;
}
.progress-fill {
    height: 100%; border-radius: 3px;
    background: linear-gradient(90deg, var(--purple), #d895fa);
    transition: width 0.4s ease;
}
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
.sync-panel {
    background: rgba(191,90,242,0.1); border: 1px solid rgba(191,90,242,0.2);
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
    font-size: 0.85rem; font-weight: 600; color: var(--purple);
    margin-bottom: 10px; display: flex; align-items: center; gap: 8px;
}
.sync-duration {
    font-size: 0.78rem; color: var(--text-secondary);
    margin-top: 8px; font-variant-numeric: tabular-nums;
}
.cld-widget {
    background: var(--glass); border: 1px solid var(--glass-border);
    border-radius: var(--radius); padding: 18px;
    margin-bottom: 20px; backdrop-filter: blur(12px);
}
.cld-widget .cld-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 14px;
}
.cld-widget .cld-title {
    font-size: 0.8rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.08em; color: var(--text-secondary);
}
.cld-widget .cld-plan {
    font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
    padding: 3px 10px; border-radius: 20px;
    background: var(--purple-bg); color: var(--purple);
}
.cld-row { margin-bottom: 14px; }
.cld-row:last-child { margin-bottom: 0; }
.cld-row-header {
    display: flex; justify-content: space-between; align-items: baseline;
    margin-bottom: 6px;
}
.cld-row-label { font-size: 0.78rem; font-weight: 500; color: var(--text); }
.cld-row-value { font-size: 0.72rem; color: var(--text-tertiary); font-variant-numeric: tabular-nums; }
.cld-bar-track {
    height: 8px; background: rgba(255,255,255,0.06);
    border-radius: 4px; overflow: hidden;
}
.cld-bar-fill {
    height: 100%; border-radius: 4px; transition: width 0.6s ease;
}
.cld-bar-fill.ok { background: linear-gradient(90deg, var(--green), #34c759); }
.cld-bar-fill.warn { background: linear-gradient(90deg, var(--orange), #ffcc02); }
.cld-bar-fill.danger { background: linear-gradient(90deg, var(--red), #ff6961); }
.cld-warn-banner {
    display: none; margin-top: 12px; padding: 10px 14px;
    border-radius: var(--radius-xs);
    background: var(--red-bg); border: 1px solid rgba(255,69,58,0.2);
    color: var(--red); font-size: 0.78rem; font-weight: 600;
}
.cld-warn-banner.visible { display: flex; align-items: center; gap: 8px; }
.cld-meta {
    font-size: 0.68rem; color: var(--text-tertiary);
    margin-top: 10px; text-align: right; font-variant-numeric: tabular-nums;
}
.alert-banner {
    padding: 12px 16px; border-radius: var(--radius-xs);
    background: var(--red-bg); border: 1px solid rgba(255,69,58,0.2);
    color: var(--red); font-size: 0.8rem; font-weight: 600;
    margin-bottom: 20px; display: flex; align-items: center; gap: 10px;
}
.alert-banner.hidden { display: none; }
.back-link {
    display: inline-flex; align-items: center; gap: 6px;
    color: var(--purple); text-decoration: none; font-weight: 600;
    font-size: 0.85rem; margin-bottom: 20px; transition: var(--transition);
}
.back-link:hover { opacity: 0.8; }
.scroll-list { max-height: 450px; overflow-y: auto; padding-right: 4px; }
.scroll-list::-webkit-scrollbar { width: 4px; }
.scroll-list::-webkit-scrollbar-track { background: transparent; }
.scroll-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
.conn-status {
    position: fixed; bottom: 16px; right: 16px;
    padding: 8px 14px; border-radius: 20px;
    font-size: 0.72rem; font-weight: 600;
    backdrop-filter: blur(20px); z-index: 999; transition: var(--transition);
}
.conn-status.connected { background: var(--green-bg); color: var(--green); border: 1px solid rgba(48,209,88,0.2); }
.conn-status.disconnected { background: var(--red-bg); color: var(--red); border: 1px solid rgba(255,69,58,0.2); }
.empty {
    text-align: center; color: var(--text-tertiary);
    font-style: italic; padding: 32px 0; font-size: 0.85rem;
}
.credit-zone {
    display: flex; gap: 10px; margin-top: 12px;
}
.credit-zone .cz-card {
    flex: 1; background: var(--surface); border-radius: var(--radius-sm);
    padding: 14px; text-align: center;
}
.credit-zone .cz-value {
    font-size: 1.3rem; font-weight: 700; font-variant-numeric: tabular-nums;
}
.credit-zone .cz-label {
    font-size: 0.68rem; color: var(--text-tertiary);
    text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px;
}
.blocked-banner {
    padding: 14px 18px; border-radius: var(--radius);
    background: var(--red-bg); border: 1px solid rgba(255,69,58,0.25);
    color: var(--red); font-size: 0.82rem; font-weight: 600;
    margin-bottom: 20px; display: flex; align-items: center; gap: 10px;
}
.blocked-banner svg { flex-shrink: 0; }
@media (max-width: 480px) {
    .container { padding: 12px 10px 60px; }
    .stats-grid { grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .stat-card { padding: 12px 8px; }
    .stat-card .stat-value { font-size: 1.2rem; }
    .credit-zone { flex-direction: column; }
}
`;

// ── Client JS ────────────────────────────────────────────────────────────────

const CLIENT_JS = `
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
function formatAllTimes() {
    document.querySelectorAll('.fmt-time').forEach(function(el) {
        var iso = el.getAttribute('data-iso');
        if (iso) el.textContent = formatTime(iso);
    });
}

// Section toggle
function initSections() {
    document.querySelectorAll('.section-header').forEach(function(h) {
        var content = h.nextElementSibling;
        if (!content.classList.contains('collapsed')) {
            content.style.maxHeight = content.scrollHeight + 'px';
        }
        h.addEventListener('click', function(e) {
            if (e.target.closest('a, button')) return;
            toggleSection(h);
        });
    });
}
function toggleSection(header, forceOpen) {
    var content = header.nextElementSibling;
    var isCollapsed = header.classList.contains('collapsed');
    if (forceOpen && !isCollapsed) return;
    if (forceOpen === false && isCollapsed) return;
    if (isCollapsed) {
        header.classList.remove('collapsed');
        content.classList.remove('collapsed');
        content.style.maxHeight = content.scrollHeight + 'px';
        setTimeout(function() { if (!content.classList.contains('collapsed')) content.style.maxHeight = 'none'; }, 400);
    } else {
        content.style.maxHeight = content.scrollHeight + 'px';
        content.offsetHeight;
        header.classList.add('collapsed');
        content.classList.add('collapsed');
        content.style.maxHeight = '0';
    }
}
initSections();

// SSE
var connEl = document.getElementById('conn-status');
var evtSource = null;
function connectSSE() {
    if (evtSource) { try { evtSource.close(); } catch(_) {} }
    evtSource = new EventSource('/status/video/events');
    evtSource.onopen = function() {
        connEl.textContent = '● Live';
        connEl.className = 'conn-status connected';
    };
    evtSource.onmessage = function(e) {
        try {
            var data = JSON.parse(e.data);
            updateVideoSyncPanel(data.syncStatus);
            updateVideoDownloadLogs(data.downloadHistory);
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

// Video Sync Panel
var vSyncTimer = null;
function updateVideoSyncPanel(status) {
    var panel = document.getElementById('video-sync-panel');
    var alertBanner = document.getElementById('video-blocked-alert');

    if (status && status.blocked) {
        if (alertBanner) {
            alertBanner.classList.remove('hidden');
            var msg = alertBanner.querySelector('.blocked-msg');
            if (msg) msg.textContent = status.blockedReason || 'Video downloads blocked.';
        }
    } else {
        if (alertBanner) alertBanner.classList.add('hidden');
    }

    if (!status || !status.isSyncing) {
        if (panel && panel.classList.contains('visible')) {
            panel.classList.remove('visible');
            if (vSyncTimer) { clearInterval(vSyncTimer); vSyncTimer = null; }
        }
        return;
    }
    panel.classList.add('visible');

    document.getElementById('vs-message').textContent = status.message || 'Processing...';
    var total = status.totalSongs || 0, cur = status.currentSongIndex || 0;
    document.getElementById('vs-progress').textContent = cur + ' / ' + total;
    var pct = total > 0 ? Math.min(100, Math.round((cur / total) * 100)) : 0;
    document.getElementById('vs-bar').style.width = pct + '%';
    document.getElementById('vs-ok').textContent = '✓ ' + (status.successCount || 0);
    document.getElementById('vs-err').textContent = '✗ ' + (status.errorCount || 0);
    document.getElementById('vs-skip').textContent = '⏭ ' + (status.skippedCount || 0);
    document.getElementById('vs-title').textContent = status.currentSongTitle || '...';

    var durEl = document.getElementById('vs-duration');
    if (status.startedAt) {
        var startMs = new Date(status.startedAt).getTime();
        function updateDur() {
            var elapsed = Math.floor((Date.now() - startMs) / 1000);
            if (elapsed < 0) elapsed = 0;
            var h = Math.floor(elapsed / 3600);
            var m = Math.floor((elapsed % 3600) / 60);
            var s = elapsed % 60;
            var parts = [];
            if (h > 0) parts.push(h + 'h');
            parts.push(m + 'm');
            parts.push(s + 's');
            durEl.textContent = '⏱ Elapsed: ' + parts.join(' ');
        }
        updateDur();
        if (vSyncTimer) clearInterval(vSyncTimer);
        vSyncTimer = setInterval(updateDur, 1000);
    } else {
        durEl.textContent = '';
        if (vSyncTimer) { clearInterval(vSyncTimer); vSyncTimer = null; }
    }
}

// Download Logs
function updateVideoDownloadLogs(history) {
    var el = document.getElementById('video-dl-list');
    var badge = document.getElementById('video-dl-badge');
    if (!history || history.length === 0) {
        el.innerHTML = '<div class="empty">No video download logs</div>';
        badge.textContent = '0';
        return;
    }
    badge.textContent = history.length;
    var html = '';
    history.forEach(function(dl) {
        var bc = dl.status==='SUCCESS' ? 'badge-success' : (dl.status==='ERROR' ? 'badge-error' : (dl.status==='BLOCKED' ? 'badge-warning' : 'badge-blue'));
        var srcBadge = dl.source === 'daily_sync' ? 'badge-purple' : (dl.source === 'change_stream' ? 'badge-accent' : 'badge-blue');
        html += '<div class="card">';
        html += '<div class="card-header">';
        html += '<div style="display:flex;gap:6px;flex-wrap:wrap">';
        html += '<span class="badge ' + bc + '">' + escHtml(dl.status||'') + '</span>';
        html += '<span class="badge ' + srcBadge + '">' + escHtml(dl.source||'') + '</span>';
        html += '</div>';
        html += '<span class="card-meta">' + formatTime(dl.timestamp) + '</span>';
        html += '</div>';
        html += '<div class="card-title">' + escHtml(dl.title||'') + '</div>';
        if (dl.details) html += '<div class="card-subtitle" style="margin-top:4px">' + escHtml(dl.details) + '</div>';
        html += '</div>';
    });
    el.innerHTML = html;
}

// Cloudinary refresh
function barClass(pct) { return pct > 80 ? 'danger' : pct > 60 ? 'warn' : 'ok'; }
function updateVideoCloudinaryUI(d) {
    if (!d) return;
    function setBar(barId, valId, pct, valText) {
        var bar = document.getElementById(barId);
        var val = document.getElementById(valId);
        if (bar) { bar.style.width = Math.min(100, pct) + '%'; bar.className = 'cld-bar-fill ' + barClass(pct); }
        if (val) val.textContent = valText;
    }
    setBar('vcld-credits-bar', 'vcld-credits-val', d.credits.usedPercent,
        d.credits.used.toFixed(2) + ' / ' + d.credits.limit + ' credits');
    setBar('vcld-storage-bar', 'vcld-storage-val', d.storage.usedPercent,
        d.storage.usedFormatted + ' / ' + d.storage.limitFormatted);
    setBar('vcld-bw-bar', 'vcld-bw-val', d.bandwidth.usedPercent,
        d.bandwidth.usedFormatted + ' / ' + d.bandwidth.limitFormatted);
    setBar('vcld-tx-bar', 'vcld-tx-val', d.transformations.usedPercent,
        d.transformations.used.toLocaleString() + ' / ' + d.transformations.limit.toLocaleString());

    var resEl = document.getElementById('vcld-resources');
    if (resEl) resEl.textContent = d.resources.toLocaleString() + ' assets';

    var warn = document.getElementById('vcld-warn');
    var remaining = d.credits.limit - d.credits.used;
    if (warn) {
        if (remaining <= 5) {
            warn.textContent = '⚠ Downloads blocked! Only ' + remaining.toFixed(2) + ' credits remaining — min 5 reserved for bandwidth';
            warn.classList.add('visible');
        } else {
            warn.classList.remove('visible');
        }
    }

    // Update stat cards
    var credUsedEl = document.getElementById('stat-credits-used');
    var credLeftEl = document.getElementById('stat-credits-left');
    if (credUsedEl) credUsedEl.textContent = d.credits.used.toFixed(1);
    if (credLeftEl) credLeftEl.textContent = remaining.toFixed(1);
}

function refreshVideoCloudinary() {
    fetch('/status/video/cloudinary-json')
        .then(function(r) { return r.json(); })
        .then(function(d) { if (d && !d.error) updateVideoCloudinaryUI(d); })
        .catch(function() {});
}
setInterval(refreshVideoCloudinary, 5 * 60 * 1000);

function triggerVideoSync() {
    showToast('Video sync triggered!');
    fetch('/status/video/trigger-sync').then(function(r){return r.json()}).then(function(d){
        if(d.success) showToast('Video sync started');
        else showToast(d.message || 'Failed', true);
    }).catch(function(){showToast('Network error',true)});
}

function clearVideoHistory() {
    if (!confirm('Clear all video download history?')) return;
    fetch('/status/video/clear-history', {method:'POST'}).then(function(r){return r.json()}).then(function(d){
        if(d.success) { showToast('History cleared'); setTimeout(function(){location.reload()},1000); }
        else showToast('Failed', true);
    }).catch(function(){showToast('Network error',true)});
}
`;

// ── Main Video Status Page ───────────────────────────────────────────────────

router.get("/", async (req, res) => {
    try {
        const [
            videoCloudinary,
            syncStatus,
            syncHistory,
            downloadHistory,
            creditCheck
        ] = await Promise.all([
            getVideoCloudinaryUsage(),
            getFileContent("video_sync_status"),
            getFileContent("video_sync_history"),
            getFileContent("video_download_history"),
            isVideoDownloadBlocked()
        ]);

        const totalSongs = await Music.countDocuments().catch(() => 0);
        const songsWithVideo = await Music.countDocuments({ videoUrl: { $exists: true, $ne: null, $ne: "" } }).catch(() => 0);
        const favSongs = await Music.countDocuments({ isFav: true }).catch(() => 0);
        const favWithoutVideo = await Music.countDocuments({
            isFav: true,
            ytId: { $exists: true, $ne: null },
            $or: [{ videoUrl: { $exists: false } }, { videoUrl: null }, { videoUrl: "" }]
        }).catch(() => 0);

        const d = videoCloudinary;
        const barColor = pct => pct > 80 ? "danger" : pct > 60 ? "warn" : "ok";
        const creditsLeft = d ? d.credits.limit - d.credits.used : 0;
        const downloadCount = Array.isArray(downloadHistory) ? downloadHistory.length : 0;
        const syncHistoryCount = Array.isArray(syncHistory) ? syncHistory.length : 0;

        const initialSyncJSON = JSON.stringify(
            syncStatus && typeof syncStatus === 'object' ? syncStatus : { isSyncing: false }
        );
        const initialDlJSON = JSON.stringify(
            Array.isArray(downloadHistory) ? downloadHistory : []
        );

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Video Status</title>
    <style>${CSS}</style>
</head>
<body>
    <div class="bg-glow"></div>
    <div id="toast" class="toast"></div>

    <div class="container">
        <a href="/status" class="back-link">← Back to Status</a>
        <div class="page-header" style="padding-top:8px">
            <h1>🎬 Video Status</h1>
            <div class="subtitle"><span class="live-dot"></span>Video Cloudinary Dashboard</div>
        </div>

        <!-- Blocked Alert -->
        <div id="video-blocked-alert" class="blocked-banner ${creditCheck.blocked ? '' : 'hidden'}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span class="blocked-msg">${creditCheck.blocked ? esc(creditCheck.reason) : ''}</span>
        </div>

        <!-- Stats -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${songsWithVideo}</div>
                <div class="stat-label">Have Video</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${favWithoutVideo}</div>
                <div class="stat-label">Pending</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${favSongs}</div>
                <div class="stat-label">Favorites</div>
            </div>
        </div>

        ${d ? `
        <!-- Video Cloudinary Usage -->
        <div class="cld-widget">
            <div class="cld-header">
                <span class="cld-title">☁ Video Cloudinary</span>
                <span class="cld-plan">${esc(d.plan)}</span>
            </div>

            <!-- Credits -->
            <div class="cld-row">
                <div class="cld-row-header">
                    <span class="cld-row-label">Credits</span>
                    <span class="cld-row-value" id="vcld-credits-val">${d.credits.used.toFixed(2)} / ${d.credits.limit} credits</span>
                </div>
                <div class="cld-bar-track">
                    <div class="cld-bar-fill ${barColor(d.credits.usedPercent)}" id="vcld-credits-bar" style="width:${Math.min(100, d.credits.usedPercent)}%"></div>
                </div>
            </div>

            <div class="credit-zone">
                <div class="cz-card">
                    <div class="cz-value" style="color:var(--purple)" id="stat-credits-used">${d.credits.used.toFixed(1)}</div>
                    <div class="cz-label">Used</div>
                </div>
                <div class="cz-card">
                    <div class="cz-value" style="color:${creditsLeft <= 5 ? 'var(--red)' : 'var(--green)'}" id="stat-credits-left">${creditsLeft.toFixed(1)}</div>
                    <div class="cz-label">Remaining</div>
                </div>
                <div class="cz-card">
                    <div class="cz-value" style="color:var(--orange)">20</div>
                    <div class="cz-label">Block At</div>
                </div>
            </div>

            <!-- Storage -->
            <div class="cld-row" style="margin-top:16px">
                <div class="cld-row-header">
                    <span class="cld-row-label">Storage</span>
                    <span class="cld-row-value" id="vcld-storage-val">${esc(d.storage.usedFormatted)} / ${esc(d.storage.limitFormatted)}</span>
                </div>
                <div class="cld-bar-track">
                    <div class="cld-bar-fill ${barColor(d.storage.usedPercent)}" id="vcld-storage-bar" style="width:${Math.min(100, d.storage.usedPercent)}%"></div>
                </div>
            </div>

            <!-- Bandwidth -->
            <div class="cld-row">
                <div class="cld-row-header">
                    <span class="cld-row-label">Bandwidth</span>
                    <span class="cld-row-value" id="vcld-bw-val">${esc(d.bandwidth.usedFormatted)} / ${esc(d.bandwidth.limitFormatted)}</span>
                </div>
                <div class="cld-bar-track">
                    <div class="cld-bar-fill ${barColor(d.bandwidth.usedPercent)}" id="vcld-bw-bar" style="width:${Math.min(100, d.bandwidth.usedPercent)}%"></div>
                </div>
            </div>

            <!-- Transformations -->
            <div class="cld-row">
                <div class="cld-row-header">
                    <span class="cld-row-label">Transformations</span>
                    <span class="cld-row-value" id="vcld-tx-val">${d.transformations.used.toLocaleString()} / ${d.transformations.limit.toLocaleString()}</span>
                </div>
                <div class="cld-bar-track">
                    <div class="cld-bar-fill ${barColor(d.transformations.usedPercent)}" id="vcld-tx-bar" style="width:${Math.min(100, d.transformations.usedPercent)}%"></div>
                </div>
            </div>

            <!-- Resources -->
            <div class="cld-row">
                <div class="cld-row-header">
                    <span class="cld-row-label">Resources</span>
                    <span class="cld-row-value" id="vcld-resources">${d.resources.toLocaleString()} assets</span>
                </div>
            </div>

            <div class="cld-warn-banner ${creditsLeft <= 5 ? 'visible' : ''}" id="vcld-warn">
                ⚠ Downloads blocked! Only ${creditsLeft.toFixed(2)} credits remaining — min 5 reserved for bandwidth
            </div>

            <div class="cld-meta">Last updated: ${esc(d.lastUpdated || '—')} · Cached 5 min</div>
        </div>
        ` : '<div class="empty">Video Cloudinary not configured or unreachable</div>'}

        <!-- Video Sync Progress Panel -->
        <div id="video-sync-panel" class="sync-panel">
            <h3><span class="live-dot"></span>Video Sync in Progress</h3>
            <div class="card-subtitle" id="vs-message" style="margin:6px 0">Initializing…</div>
            <div class="progress-track"><div class="progress-fill" id="vs-bar" style="width:0%"></div></div>
            <div class="stats-inline" style="border:none;margin:0;padding:0;justify-content:space-between">
                <span class="si" id="vs-progress" style="color:var(--text-secondary)">0/0</span>
                <span class="si green" id="vs-ok">✓ 0</span>
                <span class="si red" id="vs-err">✗ 0</span>
                <span class="si orange" id="vs-skip">⏭ 0</span>
            </div>
            <div class="card-subtitle" id="vs-title" style="margin-top:10px"></div>
            <div class="sync-duration" id="vs-duration"></div>
        </div>

        <!-- Trigger Video Sync -->
        <div style="display:flex;gap:10px;margin-bottom:20px">
            <button class="btn" style="flex:1;padding:12px;border-radius:var(--radius-sm);font-weight:600;font-size:0.82rem;cursor:pointer;border:none;background:linear-gradient(135deg,var(--purple),#d895fa);color:#fff;box-shadow:0 4px 14px rgba(191,90,242,0.25)" onclick="triggerVideoSync()">▶ Run Video Sync Now</button>
        </div>

        <!-- Daily Sync History -->
        <div class="section">
            <div class="section-header">
                <h2>Sync History</h2>
                <span class="section-badge">${syncHistoryCount}</span>
                <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="section-content">
                <div class="scroll-list">
                ${syncHistoryCount === 0 ? '<div class="empty">No sync runs yet</div>' :
                    (Array.isArray(syncHistory) ? syncHistory : []).map(run => {
                        const bc = run.status === 'COMPLETED' ? 'badge-success' : (run.status === 'BLOCKED' ? 'badge-warning' : 'badge-error');
                        let dur = '';
                        if (run.startedAt && run.completedAt) {
                            const ds = Math.floor((new Date(run.completedAt) - new Date(run.startedAt)) / 1000);
                            if (ds >= 0) dur = ` (${Math.floor(ds/60)}m ${ds%60}s)`;
                        }
                        return `<div class="card">
                            <div class="card-header">
                                <div style="display:flex;gap:6px;flex-wrap:wrap">
                                    <span class="badge ${bc}">${esc(run.status)}${esc(dur)}</span>
                                    <span class="badge badge-purple">${esc(run.type || 'sync')}</span>
                                </div>
                                <span class="card-meta fmt-time" data-iso="${esc(run.startedAt)}">${esc(run.startedAt || 'N/A')}</span>
                            </div>
                            <div class="stats-inline" style="border:none;margin:0;padding:0">
                                <span class="si green">✓ ${run.successCount || 0}</span>
                                <span class="si red">✗ ${run.errorCount || 0}</span>
                                <span class="si orange">⏭ ${run.skippedCount || 0}</span>
                                <span class="si muted">${run.totalProcessed || 0} total</span>
                            </div>
                            ${run.blockedByCredits ? '<div style="margin-top:8px;font-size:0.75rem;color:var(--red)">⚠ Stopped by credit limit</div>' : ''}
                        </div>`;
                    }).join('')
                }
                </div>
            </div>
        </div>

        <!-- Video Download History -->
        <div class="section">
            <div class="section-header">
                <h2>Video Download Logs</h2>
                <div style="display:flex;align-items:center;gap:8px">
                    <span class="section-badge" id="video-dl-badge">${downloadCount}</span>
                    ${downloadCount > 0 ? '<button style="padding:4px 12px;border-radius:20px;font-size:0.68rem;font-weight:600;cursor:pointer;border:1px solid rgba(255,69,58,0.3);background:transparent;color:var(--red)" onclick="clearVideoHistory()">Clear</button>' : ''}
                </div>
                <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="section-content">
                <div class="scroll-list" id="video-dl-list">
                ${downloadCount === 0 ? '<div class="empty">No video download logs</div>' :
                    (Array.isArray(downloadHistory) ? downloadHistory : []).map(dl => {
                        const bc = dl.status === 'SUCCESS' ? 'badge-success' : (dl.status === 'ERROR' ? 'badge-error' : (dl.status === 'BLOCKED' ? 'badge-warning' : 'badge-blue'));
                        const srcBadge = dl.source === 'daily_sync' ? 'badge-purple' : (dl.source === 'change_stream' ? 'badge-accent' : 'badge-blue');
                        return `<div class="card">
                            <div class="card-header">
                                <div style="display:flex;gap:6px;flex-wrap:wrap">
                                    <span class="badge ${bc}">${esc(dl.status || '')}</span>
                                    <span class="badge ${srcBadge}">${esc(dl.source || '')}</span>
                                </div>
                                <span class="card-meta fmt-time" data-iso="${esc(dl.timestamp)}">${esc(dl.timestamp || 'N/A')}</span>
                            </div>
                            <div class="card-title">${esc(dl.title || '')}</div>
                            ${dl.details ? `<div class="card-subtitle" style="margin-top:4px">${esc(dl.details)}</div>` : ''}
                        </div>`;
                    }).join('')
                }
                </div>
            </div>
        </div>
    </div>

    <div id="conn-status" class="conn-status disconnected">● Connecting…</div>

    <script>
        ${CLIENT_JS}
        formatAllTimes();
        updateVideoSyncPanel(${initialSyncJSON});
    </script>
</body>
</html>`;

        res.send(html);
    } catch (err) {
        console.error("[Video Status Page Error]", err);
        res.status(500).send(`<h1>Error loading video status page</h1><pre>${esc(err.message)}</pre>`);
    }
});

// ── JSON API ─────────────────────────────────────────────────────────────────

router.get("/cloudinary-json", async (req, res) => {
    try {
        const usage = await getVideoCloudinaryUsage();
        if (!usage) return res.status(503).json({ error: "Video Cloudinary unavailable" });
        res.json(usage);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get("/trigger-sync", async (req, res) => {
    try {
        const creditCheck = await isVideoDownloadBlocked();
        if (creditCheck.blocked) {
            return res.json({ success: false, message: creditCheck.reason });
        }

        // Dynamic import to avoid circular dependency
        const { syncFavoriteVideos } = await import("../scripts/videoSync.js");
        console.log("[API] Triggered video sync from video status page.");
        syncFavoriteVideos().catch(err =>
            console.error("[API] Video sync failed:", err)
        );
        res.json({ success: true, message: "Video sync started in the background." });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post("/clear-history", async (req, res) => {
    try {
        await AppDetail.findOneAndUpdate(
            { key: "video_download_history" },
            { data: [] },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
