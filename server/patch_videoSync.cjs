const fs = require('fs');
const file = 'scripts/videoSync.js';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
    'await processVideoDownload(song._id, song.ytId);',
    `const itemStartedAt = new Date().toISOString();
                await processVideoDownload(song._id, song.ytId, async (progressData) => {
                    await updateVideoSyncStatus({
                        isSyncing: true,
                        startedAt,
                        totalSongs: songs.length,
                        currentSongIndex: i + 1,
                        currentSongTitle: song.title,
                        successCount,
                        errorCount,
                        skippedCount,
                        message: \`Processing: \${song.title}\`,
                        itemMessage: progressData.message,
                        itemProgress: progressData.percent,
                        itemStartedAt
                    });
                });`
);
fs.writeFileSync(file, code);
console.log('patched videoSync.js');
