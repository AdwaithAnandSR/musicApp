const fs = require('fs');
const file = 'routes/videoStatus.routes.js';
let code = fs.readFileSync(file, 'utf8');

const oldHtml = '<div class="card-subtitle" id="vs-title" style="margin-top:10px"></div>';
const newHtml = `<div class="card-subtitle" id="vs-title" style="margin-top:10px; font-weight: bold;"></div>
            <div id="vs-item-panel" style="margin-top:12px; display:none;">
                <div style="display:flex; justify-content:space-between; font-size: 0.75rem; margin-bottom: 6px;">
                    <span id="vs-item-msg" style="color:var(--text-secondary)">Processing</span>
                    <span id="vs-item-pct" style="color:var(--accent)">0%</span>
                </div>
                <div class="progress-track" style="height: 6px; background: rgba(255,255,255,0.05); border-radius:3px; overflow:hidden;"><div class="progress-fill" id="vs-item-bar" style="width:0%; background: var(--accent); transition: width 0.3s ease;"></div></div>
                <div id="vs-item-duration" style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 6px; text-align: right;"></div>
            </div>`;
code = code.replace(oldHtml, newHtml);

const oldJs = `    document.getElementById('vs-title').textContent = status.currentSongTitle || '...';

    var durEl = document.getElementById('vs-duration');`;

const newJs = `    document.getElementById('vs-title').textContent = status.currentSongTitle || '...';

    if (status.itemMessage || status.itemProgress !== undefined) {
        document.getElementById('vs-item-panel').style.display = 'block';
        document.getElementById('vs-item-msg').textContent = status.itemMessage || '';
        document.getElementById('vs-item-pct').textContent = (status.itemProgress || 0) + '%';
        document.getElementById('vs-item-bar').style.width = (status.itemProgress || 0) + '%';
        
        if (status.itemStartedAt) {
            var itemStartMs = new Date(status.itemStartedAt).getTime();
            var itemElapsed = Math.floor((Date.now() - itemStartMs) / 1000);
            if (itemElapsed < 0) itemElapsed = 0;
            var im = Math.floor(itemElapsed / 60);
            var is = itemElapsed % 60;
            document.getElementById('vs-item-duration').textContent = 'Item Time: ' + im + 'm ' + is + 's';
        } else {
            document.getElementById('vs-item-duration').textContent = '';
        }
    } else {
        document.getElementById('vs-item-panel').style.display = 'none';
    }

    var durEl = document.getElementById('vs-duration');`;

code = code.replace(oldJs, newJs);

fs.writeFileSync(file, code);
console.log('patched videoStatus.routes.js');
