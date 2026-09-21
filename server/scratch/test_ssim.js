import { execSync } from 'child_process';
import fs from 'fs';

// Create a static image with some texture (noise)
execSync('ffmpeg -y -f lavfi -i color=c=blue:s=1280x720 -vf noise=alls=100:allf=t+u -vframes 1 scratch/base.jpg 2>/dev/null');

// Create a slightly compressed/noisy version
execSync('ffmpeg -y -i scratch/base.jpg -q:v 5 scratch/noisy.jpg 2>/dev/null');
execSync('ffmpeg -y -i scratch/base.jpg -q:v 20 scratch/noisy2.jpg 2>/dev/null');

// Create one with a small text added
execSync('ffmpeg -y -i scratch/base.jpg -vf "drawtext=text=\'Hello World\':x=100:y=100:fontsize=48:fontcolor=white" scratch/text.jpg 2>/dev/null');

function getSsim(img1, img2) {
    try {
        const stderr = execSync(`ffmpeg -i ${img1} -i ${img2} -filter_complex "ssim" -f null - 2>&1`).toString();
        const match = stderr.match(/All:([0-9.]+)/);
        return match ? parseFloat(match[1]) : 0;
    } catch (e) {
        return 0;
    }
}

console.log("Base vs Noisy (q=5) SSIM:", getSsim('scratch/base.jpg', 'scratch/noisy.jpg'));
console.log("Base vs Noisy (q=20) SSIM:", getSsim('scratch/base.jpg', 'scratch/noisy2.jpg'));
console.log("Base vs Text SSIM:", getSsim('scratch/base.jpg', 'scratch/text.jpg'));
