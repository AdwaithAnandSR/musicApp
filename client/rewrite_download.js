const fs = require('fs');

let content = fs.readFileSync('src/services/downloads/downloadService.js', 'utf8');

// replace downloadSongToLocal
const regex = /export const downloadSongToLocal = async \(song, playlistId, downloadVideo = false\) => \{([\s\S]*?)(?=export const downloadPlaylistSongs)/;

const newCode = `export const downloadSongToLocal = async (song, playlistId, downloadVideo = false) => {
    try {
        if (!song.url) return null;

        const songId = song.id || song._id;
        
        // 1. Check if song already exists in any playlist
        const meta = await getMeta();
        let existingSong = null;
        let existingPlaylistId = null;
        for (const pId in meta.songs) {
            const found = meta.songs[pId].find(s => (s.id || s._id) === songId);
            if (found && found.localUrl) {
                existingSong = found;
                existingPlaylistId = pId;
                break;
            }
        }

        const downloadsDir = new Directory(Paths.document, "downloads");
        let targetPlaylistDir;

        if (existingSong && existingSong.localUrl) {
            const parts = existingSong.localUrl.split('/');
            const parentDirName = parts[parts.length - 2];
            targetPlaylistDir = new Directory(downloadsDir, parentDirName);
        } else {
            targetPlaylistDir = new Directory(downloadsDir, String(playlistId));
            targetPlaylistDir.create({ idempotent: true, intermediates: true });
        }

        let needsAudio = true;
        let localAudioUrl = null;
        let localCoverUrl = null;
        let localVideoUrl = null;
        
        const hasVideoToDownload = downloadVideo && song.videoUrl && !song.videoUrl.startsWith("file://");
        let needsVideo = hasVideoToDownload;
        
        if (existingSong) {
            needsAudio = false;
            localAudioUrl = existingSong.localUrl;
            localCoverUrl = existingSong.cover || existingSong.artwork;
            if (existingSong.videoUrl && existingSong.videoUrl.startsWith("file://")) {
                needsVideo = false;
                localVideoUrl = existingSong.videoUrl;
            } else if (!hasVideoToDownload) {
                needsVideo = false;
            }
            
            if (!needsVideo) {
                useDownloadStatus.getState().updateSongProgress(playlistId, songId, {
                    bytesWritten: existingSong.totalBytes || 1,
                    totalBytes: existingSong.totalBytes || 1,
                    progress: 1,
                    status: "downloading"
                });
                return { localUrl: localAudioUrl, localCoverUrl, localVideoUrl };
            }
        }

        let audioBytesWritten = 0;
        let audioTotalBytes = existingSong ? (existingSong.totalBytes || 0) : 0;
        let videoBytesWritten = 0;
        let videoTotalBytes = 0;

        const onAudioProgress = ({ bytesWritten, totalBytes }) => {
            audioBytesWritten = bytesWritten;
            audioTotalBytes = totalBytes;
            let progress = totalBytes > 0 ? bytesWritten / totalBytes : 0;
            if (hasVideoToDownload) progress *= 0.2;
            useDownloadStatus.getState().updateSongProgress(playlistId, songId, {
                bytesWritten: audioBytesWritten + videoBytesWritten,
                totalBytes: audioTotalBytes + videoTotalBytes,
                progress, status: "downloading"
            });
        };

        const onVideoProgress = ({ bytesWritten, totalBytes }) => {
            videoBytesWritten = bytesWritten;
            videoTotalBytes = totalBytes;
            let progress = totalBytes > 0 ? bytesWritten / totalBytes : 0;
            const combinedProgress = existingSong ? progress : (0.2 + (progress * 0.8));
            useDownloadStatus.getState().updateSongProgress(playlistId, songId, {
                bytesWritten: audioTotalBytes + videoBytesWritten,
                totalBytes: audioTotalBytes + videoTotalBytes,
                progress: combinedProgress, status: "downloading"
            });
        };

        const taskKey = \`\${playlistId}:\${songId}\`;
        let downloadSuccess = true;

        if (needsAudio) {
            const ext = "mp3";
            const fileName = \`\${songId}.\${ext}\`;
            const file = new File(targetPlaylistDir, fileName);
            if (file.exists) { try { file.delete(); } catch(e) {} }

            const task = File.createDownloadTask(song.url, file, { onProgress: onAudioProgress });
            useDownloadStatus.setState(state => ({ downloadTasks: { ...state.downloadTasks, [taskKey]: task } }));

            downloadSuccess = false;
            try {
                await task.downloadAsync();
                downloadSuccess = true;
                localAudioUrl = file.uri;
            } catch (err) {
                console.log("Task download error:", err);
                if (file.exists) { try { file.delete(); } catch(e) {} }
            }

            const coverUrl = song.cover || song.artwork;
            if (downloadSuccess && coverUrl && !coverUrl.startsWith("file://")) {
                try {
                    let coverExt = "jpg";
                    const urlParts = coverUrl.split('?')[0].split('.');
                    if (urlParts.length > 1) {
                        const lastPart = urlParts[urlParts.length - 1];
                        if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(lastPart.toLowerCase())) coverExt = lastPart.toLowerCase();
                    }
                    const coverFileName = \`\${songId}_cover.\${coverExt}\`;
                    const coverFile = new File(targetPlaylistDir, coverFileName);
                    if (coverFile.exists) { try { coverFile.delete(); } catch(e) {} }
                    const coverTask = File.createDownloadTask(coverUrl, coverFile);
                    await coverTask.downloadAsync();
                    localCoverUrl = coverFile.uri;
                } catch (e) {
                    console.log("Cover download error:", e);
                }
            } else if (downloadSuccess) {
                localCoverUrl = coverUrl;
            }
        }

        if (downloadSuccess && needsVideo) {
            try {
                let videoExt = "mp4";
                const urlParts = song.videoUrl.split('?')[0].split('.');
                if (urlParts.length > 1) {
                    const lastPart = urlParts[urlParts.length - 1];
                    if (['mp4', 'webm', 'mov'].includes(lastPart.toLowerCase())) videoExt = lastPart.toLowerCase();
                }
                const videoFileName = \`\${songId}_video.\${videoExt}\`;
                const videoFile = new File(targetPlaylistDir, videoFileName);
                if (videoFile.exists) { try { videoFile.delete(); } catch(e) {} }

                const videoTask = File.createDownloadTask(song.videoUrl, videoFile, { onProgress: onVideoProgress });
                useDownloadStatus.setState(state => ({ downloadTasks: { ...state.downloadTasks, [taskKey]: videoTask } }));

                await videoTask.downloadAsync();
                localVideoUrl = videoFile.uri;

                // Important: Update meta for all playlists that share this song
                if (existingSong) {
                    metaMutex = metaMutex.then(async () => {
                        try {
                            const freshMeta = await getMeta();
                            let changed = false;
                            for (const pId in freshMeta.songs) {
                                const s = freshMeta.songs[pId].find(x => (x.id || x._id) === songId);
                                if (s && !s.videoUrl?.startsWith("file://")) {
                                    s.videoUrl = localVideoUrl;
                                    changed = true;
                                }
                            }
                            if (changed) await saveMeta(freshMeta);
                        } catch(e) {}
                    });
                }
            } catch (e) {
                console.log("Video download error:", e);
            }
        }

        const legacyTaskKey = \`download_task_\${playlistId}:\${songId}\`;
        storage.delete(legacyTaskKey);

        useDownloadStatus.setState(state => {
            const { [taskKey]: _, ...rest } = state.downloadTasks;
            return { downloadTasks: rest };
        });

        return downloadSuccess ? { localUrl: localAudioUrl, localCoverUrl, localVideoUrl } : null;
    } catch (e) {
        console.log("Download error:", e, e?.message);
        return null;
    }
};
`;

content = content.replace(regex, newCode);
fs.writeFileSync('src/services/downloads/downloadService.js', content, 'utf8');
