const fs = require('fs');
const file = 'utils/videoDownloader.js';
let code = fs.readFileSync(file, 'utf8');

// modify processVideoDownload signature
code = code.replace(
    'export const processVideoDownload = async (songId, ytId) => {',
    'export const processVideoDownload = async (songId, ytId, onProgress = () => {}) => {'
);

// We need to add a runFfmpeg function that handles progress
const ffmpegFunc = `
const runFfmpeg = (input, output, durationSec, onProgress) => {
    return new Promise((resolve, reject) => {
        // crop=min(ow\\,ih*9/16):ih
        const args = [
            '-y', '-i', input,
            '-vf', 'crop=min(ow\\\\,ih*9/16):ih',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '28',
            '-c:a', 'copy',
            output
        ];
        const proc = spawn('ffmpeg', args);
        let stderr = '';
        
        proc.stderr.on('data', data => {
            const str = data.toString();
            stderr += str;
            
            // extract time=00:00:05.23
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

code = code.replace('export const processVideoDownload', ffmpegFunc + '\nexport const processVideoDownload');

// Replace the download/upload flow
const oldFlow = `        console.log(\`[Video Download] Downloading raw video for \${ytId}...\`);
        await runCommand(command, dlArgs, true, env);

        if (!fs.existsSync(rawVideoPath)) {
            throw new Error("Raw video file not found after yt-dlp download");
        }

        // 3. Upload to Cloudinary using _VIDEO credentials
        console.log(\`[Video Download] Uploading to Cloudinary...\`);`;

const newFlow = `        console.log(\`[Video Download] Downloading raw video for \${ytId}...\`);
        onProgress({ message: 'Downloading from YouTube...', percent: 0, startedAt: Date.now() });
        await runCommand(command, dlArgs, true, env);

        if (!fs.existsSync(rawVideoPath)) {
            throw new Error("Raw video file not found after yt-dlp download");
        }

        // Run FFmpeg to crop
        const processedVideoPath = path.join(downloadDir, \`\${filePrefix}_cropped.mp4\`);
        console.log(\`[Video Download] Cropping video for \${ytId}...\`);
        
        // Try to get duration from musicModel
        const songDoc = await musicModel.findById(songId);
        const durationSec = songDoc ? (songDoc.duration || 0) : 0;
        
        onProgress({ message: 'Starting video crop...', percent: 0, startedAt: Date.now() });
        await runFfmpeg(rawVideoPath, processedVideoPath, durationSec, onProgress);
        
        onProgress({ message: 'Uploading to Cloudinary...', percent: 100, startedAt: Date.now() });

        // 3. Upload to Cloudinary using _VIDEO credentials
        console.log(\`[Video Download] Uploading to Cloudinary...\`);
        
        // Re-assign rawVideoPath so the rest of the code uploads the cropped version
        const uploadPath = processedVideoPath;
        `;

code = code.replace(oldFlow, newFlow);

code = code.replace('rawVideoPath,', 'uploadPath,');

// Clean up processedVideoPath in finally
code = code.replace('if (fs.existsSync(rawVideoPath)) fs.unlinkSync(rawVideoPath);', 'if (fs.existsSync(rawVideoPath)) fs.unlinkSync(rawVideoPath);\n            const processed = path.join(downloadDir, `${filePrefix}_cropped.mp4`);\n            if (fs.existsSync(processed)) fs.unlinkSync(processed);');

fs.writeFileSync(file, code);
console.log('patched videoDownloader.js');
