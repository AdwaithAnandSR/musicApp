const fs = require('fs');

let code = fs.readFileSync('utils/videoDownloader.js', 'utf8');

// Fix the argument passed to runFfmpeg
code = code.replace(
    'await runFfmpeg(rawVideoPath, processedVideoPath, durationSec, onProgress);',
    'await runFfmpeg(rawVideoPath, processedVideoPath, durationSec, internalOnProgress);'
);

// Fix the logic when durationSec is 0 or missing
const oldFfmpegLoop = `            if (outTimeUs !== null && durationSec > 0) {
                let currentSec = outTimeUs / 1000000;
                let pct = Math.round((currentSec / durationSec) * 100);
                if (pct > 100) pct = 100;
                
                onProgress({ message: 'FFmpeg processing: ' + pct + '% • ' + currentSpeed, percent: pct, startedAt: Date.now() });
            }`;

const newFfmpegLoop = `            if (outTimeUs !== null) {
                if (durationSec > 0) {
                    let currentSec = outTimeUs / 1000000;
                    let pct = Math.round((currentSec / durationSec) * 100);
                    if (pct > 100) pct = 100;
                    
                    onProgress({ message: 'FFmpeg processing: ' + pct + '% • ' + currentSpeed, percent: pct, startedAt: Date.now() });
                } else {
                    onProgress({ message: 'FFmpeg processing • ' + currentSpeed, percent: 0, startedAt: Date.now() });
                }
            }`;

code = code.replace(oldFfmpegLoop, newFfmpegLoop);

fs.writeFileSync('utils/videoDownloader.js', code);
console.log('Fixed runFfmpeg callback and durationSec=0 case!');
