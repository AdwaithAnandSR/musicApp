import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const execPromise = (cmd) =>
    new Promise((resolve, reject) => {
        exec(cmd, (err, stdout, stderr) => {
            if (err) return reject(err);
            resolve({ stdout, stderr });
        });
    });

export const detectStaticVideo = async (videoPath, durationSec = 0) => {
    let tempDir = null;

    try {
        let duration = durationSec;

        // Get duration if it wasn't supplied
        if (!duration || duration <= 0) {
            try {
                const { stdout } = await execPromise(
                    `ffprobe -v error -show_entries format=duration ` +
                    `-of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
                );

                duration = parseFloat(stdout);
            } catch (e) {
                console.error(
                    '[Static Detection] Failed to get duration:',
                    e
                );
            }
        }

        if (!duration || duration < 5) {
            console.log(
                `[Static Detection] MOVING: Video too short (${duration}s)`
            );

            return {
                isStatic: false,
                reason: 'Too short'
            };
        }

        /*
         * Sample across the whole video.
         *
         * Avoid the first/last few percent because intro/outro
         * transitions can cause false movement detection.
         */
        const fractions = [
            0.10,
            0.25,
            0.40,
            0.55,
            0.70,
            0.85,
            0.95
        ];

        const timestamps = fractions.map(
            f => (duration * f).toFixed(2)
        );

        tempDir = fs.mkdtempSync(
            path.join(os.tmpdir(), 'static-detect-')
        );

        const frames = [];

        /*
         * Extract small frames.
         *
         * 320x180 is enough for detecting whether the image
         * is changing and is much faster than comparing
         * full-resolution PNGs.
         */
        for (let i = 0; i < timestamps.length; i++) {
            const framePath = path.join(
                tempDir,
                `frame_${i}.png`
            );

            try {
                await execPromise(
                    `ffmpeg -y ` +
                    `-ss ${timestamps[i]} ` +
                    `-i "${videoPath}" ` +
                    `-frames:v 1 ` +
                    `-vf "scale=320:180:force_original_aspect_ratio=decrease,"` +
                    `pad=320:180:(ow-iw)/2:(oh-ih)/2 ` +
                    `"${framePath}"`
                );

                if (fs.existsSync(framePath)) {
                    frames.push(framePath);
                }
            } catch (e) {
                console.error(
                    `[Static Detection] Failed to extract frame at ${timestamps[i]}`
                );
            }
        }

        if (frames.length < 3) {
            console.log(
                '[Static Detection] MOVING: Failed to extract enough frames'
            );

            return {
                isStatic: false,
                reason: 'Failed to extract enough frames'
            };
        }

        /*
         * Compare CONSECUTIVE frames instead of comparing
         * everything against one anchor frame.
         *
         * frame0 ↔ frame1
         * frame1 ↔ frame2
         * frame2 ↔ frame3
         * ...
         */
        let comparisons = 0;
        let staticMatches = 0;
        let totalSsim = 0;
        let minSsim = 1.0;

        /*
         * YouTube re-encoding can cause tiny pixel differences
         * even when the displayed image is effectively static.
         *
         * 0.985 is a much more practical threshold than 0.995.
         */
        const SSIM_THRESHOLD = 0.985;

        for (let i = 1; i < frames.length; i++) {
            const previousFrame = frames[i - 1];
            const currentFrame = frames[i];

            try {
                const { stderr } = await execPromise(
                    `ffmpeg -i "${previousFrame}" ` +
                    `-i "${currentFrame}" ` +
                    `-filter_complex "ssim" ` +
                    `-f null -`
                );

                const match = stderr.match(
                    /All:([0-9.]+)/
                );

                if (!match || !match[1]) {
                    continue;
                }

                const ssimVal = parseFloat(match[1]);

                if (!Number.isFinite(ssimVal)) {
                    continue;
                }

                totalSsim += ssimVal;
                comparisons++;

                if (ssimVal < minSsim) {
                    minSsim = ssimVal;
                }

                if (ssimVal >= SSIM_THRESHOLD) {
                    staticMatches++;
                }
            } catch (e) {
                console.error(
                    `[Static Detection] Failed to compare frames ${i - 1} and ${i}`
                );
            }
        }

        if (comparisons === 0) {
            console.log(
                '[Static Detection] MOVING: No valid comparisons'
            );

            return {
                isStatic: false,
                reason: 'Comparison failed'
            };
        }

        const avgSsim = totalSsim / comparisons;

        /*
         * Require most comparisons to be static.
         *
         * Example with 6 comparisons:
         * 6 comparisons -> need 5
         * 5 comparisons -> need 4
         * 4 comparisons -> need 3
         *
         * This allows one abnormal transition/fade.
         */
        const requiredMatches = Math.max(
            1,
            Math.ceil(comparisons * 0.80)
        );

        const matchRatio =
            staticMatches / comparisons;

        /*
         * Final decision:
         *
         * 1. Most frame pairs must pass the threshold.
         * 2. Overall average must be high.
         * 3. Minimum must not be too low.
         *
         * This prevents a video with a few very similar frames
         * from being incorrectly classified as static.
         */
        const isStatic =
            staticMatches >= requiredMatches &&
            avgSsim >= 0.985 &&
            minSsim >= 0.975;

        const avgSsimFormatted = avgSsim.toFixed(4);
        const minSsimFormatted = minSsim.toFixed(4);
        const matchRatioFormatted = matchRatio.toFixed(2);

        if (isStatic) {
            console.log(
                `[Static Detection] STATIC: ` +
                `similarity_min=${minSsimFormatted}, ` +
                `similarity_avg=${avgSsimFormatted}, ` +
                `matches=${staticMatches}/${comparisons}, ` +
                `ratio=${matchRatioFormatted}, ` +
                `(Threshold: ${SSIM_THRESHOLD})`
            );
        } else {
            console.log(
                `[Static Detection] MOVING: ` +
                `similarity_min=${minSsimFormatted}, ` +
                `similarity_avg=${avgSsimFormatted}, ` +
                `matches=${staticMatches}/${comparisons}, ` +
                `ratio=${matchRatioFormatted}, ` +
                `(Threshold: ${SSIM_THRESHOLD})`
            );
        }

        return {
            isStatic,
            ssim: avgSsimFormatted,
            matches: staticMatches,
            comparisons,
            minSsim: minSsimFormatted,
            matchRatio: matchRatioFormatted
        };

    } catch (err) {
        console.error(
            '[Static Detection] Error during detection:',
            err
        );

        return {
            isStatic: false,
            reason: 'Error during detection'
        };

    } finally {
        if (tempDir && fs.existsSync(tempDir)) {
            try {
                fs.rmSync(tempDir, {
                    recursive: true,
                    force: true
                });
            } catch (e) {}
        }
    }
};