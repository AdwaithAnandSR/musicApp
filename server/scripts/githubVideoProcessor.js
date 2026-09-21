import fs from 'fs';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import path from 'path';
import { spawn } from 'child_process';
import { v2 as cloudinary } from 'cloudinary';

const JOB_ID = process.env.JOB_ID;
const API_BASE = process.env.API_BASE;

if (!JOB_ID || !API_BASE) {
    console.error("Missing JOB_ID or API_BASE environment variables.");
    process.exit(1);
}

const sendProgress = async (message, percent, startedAt) => {
    try {
        await fetch(`${API_BASE}/internal/video-callback/${JOB_ID}/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, percent, startedAt })
        });
    } catch (err) {
        console.error("Failed to send progress:", err.message);
    }
};

const sendStatus = async (status, videoUrl = null, error = null) => {
    try {
        await fetch(`${API_BASE}/internal/video-callback/${JOB_ID}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, videoUrl, error })
        });
    } catch (err) {
        console.error("Failed to send status:", err.message);
    }
};

const runFfmpeg = async (input, output, durationSec, startedAt) => {
    await sendProgress('Detecting borders...', 0, startedAt);
    
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
        
        const matches = detectOut.match(/crop=(\d+:\d+:\d+:\d+)/g);
        if (matches && matches.length > 0) {
            cropVal = matches[matches.length - 1];
        }
    } catch(e) {
        console.error('[FFmpeg] cropdetect failed:', e);
    }
    
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
            const matches = detectOut.match(/crop=(\d+:\d+:\d+:\d+)/g);
            if (matches && matches.length > 0) {
                cropVal = matches[matches.length - 1];
            }
        } catch(e) {}
    }
    
    let vfFilter = 'crop=min(ow\\,ih*9/16):ih';
    if (cropVal) {
        console.log('[FFmpeg] Detected border crop:', cropVal);
        vfFilter = `${cropVal},crop=min(ow\\,ih*9/16):ih`;
    } else {
        console.log('[FFmpeg] No borders detected, using default crop.');
    }
    
    await sendProgress('Cropping and Encoding...', 0, startedAt);
    
    return new Promise((resolve, reject) => {
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
        let lastReportedPct = -1;
        let lastReportTime = 0;
        
        proc.stdout.on('data', data => {
            stdoutBuf += data.toString();
            const lines = stdoutBuf.split('\n');
            stdoutBuf = lines.pop(); 
            
            let outTimeUs = null;
            let progressState = null;
            
            for (const line of lines) {
                const [k, ...vParts] = line.split('=');
                const v = vParts.join('=');
                
                if (k === 'speed') currentSpeed = v.trim();
                if (k === 'out_time_us') outTimeUs = parseInt(v, 10);
                if (k === 'progress') progressState = v.trim();
            }
            
            const now = Date.now();
            // throttle reports to max 1 per second
            if (outTimeUs !== null && (now - lastReportTime > 1000 || progressState === 'end')) {
                if (durationSec > 0) {
                    let currentSec = outTimeUs / 1000000;
                    let pct = Math.round((currentSec / durationSec) * 100);
                    if (pct > 100) pct = 100;
                    
                    if (pct !== lastReportedPct) {
                        sendProgress('FFmpeg processing: ' + pct + '% • ' + currentSpeed, pct, startedAt);
                        lastReportedPct = pct;
                        lastReportTime = now;
                    }
                } else {
                    sendProgress('FFmpeg processing • ' + currentSpeed, 0, startedAt);
                    lastReportTime = now;
                }
            }
            
            if (progressState === 'end') {
                sendProgress('FFmpeg processing: 100% • Finished', 100, startedAt);
            }
        });

        proc.stderr.on('data', data => {
            stderr += data.toString();
        });
        
        proc.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error('FFmpeg failed with code ' + code + ': ' + stderr.slice(-1000)));
        });
    });
};

const main = async () => {
    let jobDetails;
    const startedAt = Date.now();

    try {
        console.log(`Fetching job details from ${API_BASE}/internal/video-job/${JOB_ID}`);
        const res = await fetch(`${API_BASE}/internal/video-job/${JOB_ID}`);
        if (!res.ok) {
            throw new Error(`Failed to fetch job details: ${res.statusText}`);
        }
        jobDetails = await res.json();
    } catch (err) {
        console.error("Initialization error:", err);
        await sendStatus('error', null, "Initialization error: " + err.message);
        process.exit(1);
    }

    const { rawVideoUrl, durationSec, cloudinary: cloudCreds } = jobDetails;
    
    const downloadDir = path.resolve(process.cwd(), "downloads");
    if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });
    
    const rawVideoPath = path.join(downloadDir, `raw_${JOB_ID}.mp4`);
    const processedVideoPath = path.join(downloadDir, `processed_${JOB_ID}.mp4`);

    try {
        // 1. Download raw video
        await sendProgress('Downloading raw video to runner...', 0, startedAt);
        console.log(`Downloading raw video from ${rawVideoUrl}`);
        const dlRes = await fetch(rawVideoUrl);
        if (!dlRes.ok) throw new Error(`Failed to download raw video: ${dlRes.statusText}`);
        
        const fileStream = fs.createWriteStream(rawVideoPath);
        await pipeline(Readable.fromWeb(dlRes.body), fileStream);

        // 2. FFmpeg Crop & Encode
        console.log("Starting FFmpeg processing");
        await runFfmpeg(rawVideoPath, processedVideoPath, durationSec, startedAt);
        
        // 3. Upload to Cloudinary
        await sendProgress('Uploading to Cloudinary...', 100, startedAt);
        console.log("Uploading to Cloudinary...");
        
        cloudinary.config({
            cloud_name: cloudCreds.cloud_name,
            api_key: cloudCreds.api_key,
            api_secret: cloudCreds.api_secret
        });
        
        const uploadResult = await cloudinary.uploader.upload(
            processedVideoPath,
            {
                resource_type: "video",
                folder: "musicApp/backgrounds"
            }
        );
        
        console.log("Upload successful:", uploadResult.secure_url);
        await sendStatus('success', uploadResult.secure_url);
        
    } catch (err) {
        console.error("Processing error:", err);
        await sendStatus('error', null, err.message);
        process.exit(1);
    } finally {
        try { if (fs.existsSync(rawVideoPath)) fs.unlinkSync(rawVideoPath); } catch (e) {}
        try { if (fs.existsSync(processedVideoPath)) fs.unlinkSync(processedVideoPath); } catch (e) {}
    }
};

main();
