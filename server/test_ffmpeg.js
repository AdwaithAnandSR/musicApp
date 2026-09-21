const { spawn } = require('child_process');

async function getCrop(file) {
    return new Promise((resolve) => {
        const proc = spawn('ffmpeg', ['-i', file, '-t', '2', '-vf', 'cropdetect=24:16:0', '-f', 'null', '-']);
        let out = '';
        proc.stderr.on('data', d => out += d.toString());
        proc.on('close', () => {
            const match = out.match(/crop=(\d+:\d+:\d+:\d+)/g);
            if (match) {
                resolve(match[match.length - 1]);
            } else {
                resolve(null);
            }
        });
    });
}
