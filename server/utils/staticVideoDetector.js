import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const execPromise = (cmd) => new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
        if (err) return reject(err);
        resolve({ stdout, stderr });
    });
});

export const detectStaticVideo = async (videoPath, durationSec = 0) => {
    let tempDir = null;
    try {
        let duration = durationSec;
        if (!duration || duration <= 0) {
            try {
                const { stdout } = await execPromise(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`);
                duration = parseFloat(stdout);
            } catch (e) {
                console.error("[Static Detection] Failed to get duration", e);
            }
        }

        if (!duration || duration < 5) {
            console.log(`[Static Detection] MOVING: Video too short (${duration}s)`);
            return { isStatic: false, reason: "Too short" };
        }

        const fractions = [0.10, 0.25, 0.40, 0.55, 0.70, 0.85, 0.95];
        const timestamps = fractions.map(f => (duration * f).toFixed(2));
        
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'static-detect-'));
        const frames = [];

        // Extract frames as PNG to avoid compression artifacts that JPEG would introduce
        for (let i = 0; i < timestamps.length; i++) {
            const framePath = path.join(tempDir, `frame_${i}.png`);
            try {
                await execPromise(`ffmpeg -y -ss ${timestamps[i]} -i "${videoPath}" -vframes 1 "${framePath}"`);
                if (fs.existsSync(framePath)) {
                    frames.push(framePath);
                }
            } catch (e) {
                console.error(`[Static Detection] Failed to extract frame at ${timestamps[i]}`);
            }
        }

        if (frames.length < 3) {
             console.log(`[Static Detection] MOVING: Failed to extract enough frames`);
             return { isStatic: false, reason: "Failed to extract enough frames" };
        }

        // Use the middle frame as the anchor (likely index 3, which is 55%)
        const anchorIndex = Math.floor(frames.length / 2);
        const anchorFrame = frames[anchorIndex];
        
        let comparisons = 0;
        let staticMatches = 0;
        let totalSsim = 0;
        let minSsim = 1.0;

        // Tunable threshold
        const SSIM_THRESHOLD = 0.955; 

        for (let i = 0; i < frames.length; i++) {
            if (i === anchorIndex) continue;
            
            const currentFrame = frames[i];
            try {
                const { stderr } = await execPromise(`ffmpeg -i "${anchorFrame}" -i "${currentFrame}" -filter_complex "ssim" -f null -`);
                const match = stderr.match(/All:([0-9.]+)/);
                if (match && match[1]) {
                    const ssimVal = parseFloat(match[1]);
                    totalSsim += ssimVal;
                    comparisons++;
                    if (ssimVal < minSsim) minSsim = ssimVal;
                    
                    if (ssimVal >= SSIM_THRESHOLD) {
                        staticMatches++;
                    }
                }
            } catch (e) {
                console.error(`[Static Detection] Failed to compare frame ${i}`);
            }
        }

        if (comparisons === 0) {
            return { isStatic: false, reason: "Comparison failed" };
        }

        const avgSsim = (totalSsim / comparisons).toFixed(4);
        minSsim = minSsim.toFixed(4);
        
        // We allow up to 2 mismatches (e.g. for intro/outro fades)
        // If at least (comparisons - 2) frames match the anchor, we consider it static.
        const requiredMatches = Math.max(1, comparisons - 2);
        
        const isStatic = staticMatches >= requiredMatches;
        
        if (isStatic) {
            console.log(`[Static Detection] STATIC: similarity_min=${minSsim}, similarity_avg=${avgSsim}, matches=${staticMatches}/${comparisons} (Threshold: ${SSIM_THRESHOLD})`);
        } else {
            console.log(`[Static Detection] MOVING: similarity_min=${minSsim}, similarity_avg=${avgSsim}, matches=${staticMatches}/${comparisons} (Threshold: ${SSIM_THRESHOLD})`);
        }
        
        return { isStatic, ssim: avgSsim, matches: staticMatches, minSsim };

    } catch (err) {
        console.error("[Static Detection] Error during detection:", err);
        return { isStatic: false, reason: "Error during detection" };
    } finally {
        if (tempDir && fs.existsSync(tempDir)) {
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (e) {}
        }
    }
};
