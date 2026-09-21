const fs = require('fs');
let code = fs.readFileSync('routes/videoStatus.routes.js', 'utf8');

// Broadcast active downloads
code = code.replace(
    'broadcastVideoSSE({ syncStatus, downloadHistory });',
    'broadcastVideoSSE({ syncStatus, downloadHistory, activeDownloads: global.activeVideoDownloads || {} });'
);

// HTML addition
const targetHtml = '<!-- Daily Sync History -->';
const newHtml = `<!-- Active Individual Downloads -->
        <div class="section" id="active-downloads-section" style="display:none">
            <div class="section-header">
                <h2>Active Individual Downloads</h2>
                <span class="section-badge" id="active-dl-count">0</span>
            </div>
            <div class="section-content">
                <div class="scroll-list" id="active-dl-list"></div>
            </div>
        </div>

        <!-- Daily Sync History -->`;
code = code.replace(targetHtml, newHtml);

// JS logic addition
const targetJs = 'updateVideoSyncPanel(data.syncStatus);';
const newJs = `updateVideoSyncPanel(data.syncStatus);
            updateActiveDownloadsPanel(data.activeDownloads || {});`;

code = code.replace(targetJs, newJs);

// Function definition in JS
const funcDefTarget = 'function updateVideoSyncPanel(status) {';
const newFunc = `
function updateActiveDownloadsPanel(activeDownloads) {
    var keys = Object.keys(activeDownloads);
    var section = document.getElementById('active-downloads-section');
    var list = document.getElementById('active-dl-list');
    var count = document.getElementById('active-dl-count');
    
    if (keys.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    count.textContent = keys.length;
    
    var html = '';
    keys.forEach(function(k) {
        var d = activeDownloads[k];
        var pct = d.percent || 0;
        var dur = '';
        if (d.startedAt) {
            var elapsed = Math.floor((Date.now() - d.startedAt) / 1000);
            if (elapsed < 0) elapsed = 0;
            var m = Math.floor(elapsed / 60);
            var s = elapsed % 60;
            dur = m + 'm ' + s + 's';
        }
        
        html += '<div class="card" style="border-left: 3px solid var(--accent);">';
        html += '    <div style="font-size: 0.8rem; font-weight: 600; color: #fff; margin-bottom: 6px;">YouTube ID: ' + escHtml(k) + '</div>';
        html += '    <div style="display:flex; justify-content:space-between; font-size: 0.75rem; margin-bottom: 4px;">';
        html += '        <span style="color:var(--text-secondary)">' + escHtml(d.message || 'Processing...') + '</span>';
        html += '        <span style="color:var(--accent)">' + pct + '%</span>';
        html += '    </div>';
        html += '    <div class="progress-track" style="height: 6px; background: rgba(255,255,255,0.05); border-radius:3px; overflow:hidden;">';
        html += '        <div class="progress-fill" style="width:' + pct + '%; background: var(--accent); transition: width 0.3s ease;"></div>';
        html += '    </div>';
        html += '    <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 6px; text-align: right;">Elapsed: ' + dur + '</div>';
        html += '</div>';
    });
    
    list.innerHTML = html;
}

function updateVideoSyncPanel(status) {`;
code = code.replace(funcDefTarget, newFunc);

fs.writeFileSync('routes/videoStatus.routes.js', code);
console.log('patched videoStatus.routes.js for individual downloads');
