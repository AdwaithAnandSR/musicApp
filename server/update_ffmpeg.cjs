const fs = require('fs');

let code = fs.readFileSync('utils/videoDownloader.js', 'utf8');

// 1. Remove the old runFfmpeg block completely
const startIdx = code.indexOf('const runFfmpeg =');
const endIdx = code.indexOf('export const processVideoDownload =');
if (startIdx !== -1 && endIdx !== -1) {
    code = code.substring(0, startIdx) + code.substring(endIdx);
}

// 2. Define the new runFfmpeg block
const newFfmpeg = `
const runFfmpeg = async (input, output, durationSec, onProgress) => {
    // Pass 1: cropdetect
    onProgress({ message: 'Detecting borders...', percent: 0, startedAt: Date.now() });
    
    let cropVal = null;
    try {
        const detectArgs = [
            '-y', '-ss', '00:00:15', '-i', input,
            '-t', '2',
            '-vf', 'cropdetect=24:16:0',
            '-f', 'null', '-'
        ];
        
        const detectOut = await new Promise((resolve, reject) => {
            const proc = spawn('ffmpeg', detectArgs);
            let stderr = '';
            proc.stderr.on('data', d => stderr += d.toString());
            proc.on('close', code => resolve(stderr));
            proc.on('error', reject);
        });
        
        const matches = detectOut.match(/crop=(\\d+:\\d+:\\d+:\\d+)/g);
        if (matches && matches.length > 0) {
            cropVal = matches[matches.length - 1];
        }
    } catch(e) {
        console.error('[FFmpeg] cropdetect failed:', e);
    }
    
    // Fallback detection without -ss if 15s seek failed (e.g., short video)
    if (!cropVal) {
        try {
            const detectArgs = [
                '-y', '-i', input,
                '-t', '2',
                '-vf', 'cropdetect=24:16:0',
                '-f', 'null', '-'
            ];
            const detectOut = await new Promise((resolve, reject) => {
                const proc = spawn('ffmpeg', detectArgs);
                let stderr = '';
                proc.stderr.on('data', d => stderr += d.toString());
                proc.on('close', code => resolve(stderr));
                proc.on('error', reject);
            });
            const matches = detectOut.match(/crop=(\\d+:\\d+:\\d+:\\d+)/g);
            if (matches && matches.length > 0) {
                cropVal = matches[matches.length - 1];
            }
        } catch(e) {}
    }
    
    // Construct final filter chain
    // If cropVal found (e.g. crop=1920:800:0:140), apply it first, then crop to 9:16 portrait.
    // The second crop min(ow, ih*9/16):ih ensures it fits vertically and centers horizontally.
    let vfFilter = 'crop=min(ow\\\\,ih*9/16):ih';
    if (cropVal) {
        console.log('[FFmpeg] Detected border crop:', cropVal);
        vfFilter = \`\${cropVal},crop=min(ow\\\\,ih*9/16):ih\`;
    } else {
        console.log('[FFmpeg] No borders detected, using default crop.');
    }
    
    onProgress({ message: 'Cropping and Encoding...', percent: 0, startedAt: Date.now() });
    
    return new Promise((resolve, reject) => {
        const args = [
            '-y', '-i', input,
            '-vf', vfFilter,
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '28',
            '-c:a', 'copy',
            output
        ];
        
        const proc = spawn('ffmpeg', args);
        let stderr = '';
        
        proc.stderr.on('data', data => {
            const str = data.toString();
            stderr += str;
            
            const timeMatch = str.match(/time=(\\d{2}):(\\d{2}):(\\d{2}\\.\\d+)/);
            if (timeMatch && durationSec > 0) {
                const h = parseInt(timeMatch[1], 10);
                const m = parseInt(timeMatch[2], 10);
                const s = parseFloat(timeMatch[3]);
                const currentSec = h * 3600 + m * 60 + s;
                let pct = Math.round((currentSec / durationSec) * 100);
                if (pct > 100) pct = 100;
                
                onProgress({ message: 'Cropping and Encoding...', percent: pct, startedAt: Date.now() });
            }
        });
        
        proc.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error('FFmpeg failed with code ' + code + ': ' + stderr.slice(-1000)));
        });
    });
};

`;

code = code.replace('export const processVideoDownload =', newFfmpeg + 'export const processVideoDownload =');

// 3. Since runFfmpeg is now correctly calling its local `onProgress` parameter, 
// we ensure the caller in processVideoDownload passes `internalOnProgress`.
code = code.replace(
    'await runFfmpeg(rawVideoPath, processedVideoPath, durationSec, internalOnProgress);',
    'await runFfmpeg(rawVideoPath, processedVideoPath, durationSec, internalOnProgress);'
); 
// (The regex previously changed it to internalOnProgress, so it's already passing internalOnProgress)

fs.writeFileSync('utils/videoDownloader.js', code);
console.log('patched videoDownloader.js with cropdetect pipeline');
