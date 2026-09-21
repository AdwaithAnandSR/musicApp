const fs = require('fs');

// 1. Modify videoDownloader.js to track global.activeVideoDownloads
let vd = fs.readFileSync('utils/videoDownloader.js', 'utf8');
const globalInit = `
if (!global.activeVideoDownloads) global.activeVideoDownloads = {};
`;
if (!vd.includes('global.activeVideoDownloads')) {
    vd = globalInit + vd;
    
    // Add logic to register/update/clear in processVideoDownload
    vd = vd.replace('export const processVideoDownload = async (songId, ytId, onProgress = () => {}) => {', 
    `export const processVideoDownload = async (songId, ytId, onProgress = () => {}) => {
    let internalOnProgress = (data) => {
        global.activeVideoDownloads[ytId] = { ...data, ytId, songId };
        onProgress(data);
    };
    global.activeVideoDownloads[ytId] = { message: 'Initializing...', percent: 0, startedAt: Date.now(), ytId, songId };
`);

    // In finally, clear it
    vd = vd.replace('if (cookieFile && fs.existsSync(cookieFile))', `delete global.activeVideoDownloads[ytId];
        if (cookieFile && fs.existsSync(cookieFile))`);
    
    // Replace all onProgress calls inside processVideoDownload with internalOnProgress
    vd = vd.replace(/onProgress\(\{/g, 'internalOnProgress({');
    
    // But wait, runFfmpeg also calls onProgress... runFfmpeg takes onProgress as an argument
    // it will call internalOnProgress because we pass it!
    fs.writeFileSync('utils/videoDownloader.js', vd);
    console.log('patched videoDownloader.js');
}
