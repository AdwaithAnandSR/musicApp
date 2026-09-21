const fs = require('fs');

let code = fs.readFileSync('utils/videoDownloader.js', 'utf8');

const oldProc = `    return new Promise((resolve, reject) => {
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
    });`;

const newProc = `    return new Promise((resolve, reject) => {
        const args = [
            '-y', '-i', input,
            '-vf', vfFilter,
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '28',
            '-c:a', 'copy',
            '-progress', 'pipe:1',
            output
        ];
        
        const proc = spawn('ffmpeg', args);
        let stderr = '';
        let stdoutBuf = '';
        
        let currentSpeed = '1.0x';
        
        proc.stdout.on('data', data => {
            stdoutBuf += data.toString();
            const lines = stdoutBuf.split('\\n');
            stdoutBuf = lines.pop(); // keep the last incomplete line in buffer
            
            let outTimeUs = null;
            let progressState = null;
            
            for (const line of lines) {
                const [k, ...vParts] = line.split('=');
                const v = vParts.join('=');
                
                if (k === 'speed') currentSpeed = v.trim();
                if (k === 'out_time_us') outTimeUs = parseInt(v, 10);
                if (k === 'progress') progressState = v.trim();
            }
            
            if (outTimeUs !== null && durationSec > 0) {
                let currentSec = outTimeUs / 1000000;
                let pct = Math.round((currentSec / durationSec) * 100);
                if (pct > 100) pct = 100;
                
                onProgress({ message: 'FFmpeg processing: ' + pct + '% • ' + currentSpeed, percent: pct, startedAt: Date.now() });
            }
            
            if (progressState === 'end') {
                onProgress({ message: 'FFmpeg processing: 100% • Finished', percent: 100, startedAt: Date.now() });
            }
        });

        proc.stderr.on('data', data => {
            stderr += data.toString();
        });
        
        proc.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error('FFmpeg failed with code ' + code + ': ' + stderr.slice(-1000)));
        });
    });`;

code = code.replace(oldProc, newProc);

fs.writeFileSync('utils/videoDownloader.js', code);
console.log('patched videoDownloader.js with pipe:1 progress');
