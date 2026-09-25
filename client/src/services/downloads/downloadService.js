import { File, Directory, Paths } from "expo-file-system";
import { MMKV } from "react-native-mmkv";
import { useDownloadStatus } from "../../store/appState.store.js";

const storage = new MMKV({ id: "downloads-storage" });
let metaMutex = Promise.resolve();

const getMetaFile = () => {
    const downloadsDir = new Directory(Paths.document, "downloads");
    if (!downloadsDir.exists) downloadsDir.create();
    return new File(downloadsDir, "meta.json");
};

const getMeta = async () => {
    try {
        const file = getMetaFile();
        if (!file.exists) return { playlists: {}, songs: {} };
        const text = file.text(); // Assuming text() is sync or returns a promise, wait, in Expo next API file.text() might be sync? If it returns a promise, await it.
        // Actually, in expo-file-system/next, file.text() returns a string! Wait, no, it's file.text() -> string? Let's await just in case, or use readAsStringAsync if it was legacy.
        // Wait, standard Expo SDK 57 File has .text() which is a string. But wait, we can just use `file.text()` if it's sync. If it's a promise, we should await.
        const content = await file.text();
        return JSON.parse(content);
    } catch (e) {
        return { playlists: {}, songs: {} };
    }
};

const saveMeta = async meta => {
    try {
        const file = getMetaFile();
        file.write(JSON.stringify(meta));
    } catch (e) {
        console.log("Failed to save meta:", e);
    }
};

export const getDownloadedPlaylists = async () => {
    const meta = await getMeta();
    return Object.values(meta.playlists);
};

export const getDownloadedSongs = async playlistId => {
    const meta = await getMeta();
    return meta.songs[playlistId] || [];
};

export const saveDownloadedPlaylist = async playlist => {
    return new Promise(resolve => {
        metaMutex = metaMutex.then(async () => {
            try {
                const meta = await getMeta();
                meta.playlists[playlist.id] = {
                    ...(meta.playlists[playlist.id] || {}),
                    ...playlist
                };
                await saveMeta(meta);
            } catch (e) {
                console.log("Failed to save playlist meta:", e);
            }
            resolve();
        });
    });
};

export const deleteDownloadedPlaylist = async playlistId => {
    // 1. Cancel active download tasks
    const pendingSongs =
        useDownloadStatus.getState().downloadingPlaylists[playlistId] || [];
    const allTasks = useDownloadStatus.getState().downloadTasks;

    for (const song of pendingSongs) {
        const songId = song.id || song._id;
        const taskKey = `${playlistId}:${songId}`;
        const task = allTasks[taskKey];
        if (task) {
            try {
                await task.cancelAsync();
            } catch (e) {
                console.log("Failed to cancel task:", e);
            }
        }
        useDownloadStatus.getState().removeDownloadingSong(songId);
        storage.delete(`download_task_${playlistId}:${songId}`);
    }

    useDownloadStatus.setState(state => {
        const { [playlistId]: _, ...rest } = state.downloadingPlaylists;
        return { downloadingPlaylists: rest };
    });

    // 2 & 3. Delete files safely and clear state
    return new Promise(resolve => {
        metaMutex = metaMutex.then(async () => {
            try {
                const meta = await getMeta();
                const songs = meta.songs[playlistId] || [];

                const downloadsDir = new Directory(Paths.document, "downloads");
                const playlistDir = new Directory(downloadsDir, String(playlistId));
                let playlistDirSafeToDelete = true;

                for (const song of songs) {
                    const songId = song.id || song._id;
                    let isShared = false;
                    for (const pId in meta.songs) {
                        if (pId !== String(playlistId) && meta.songs[pId].find(s => (s.id || s._id) === songId)) {
                            isShared = true;
                            break;
                        }
                    }

                    if (isShared) {
                        if (song.localUrl && song.localUrl.includes(`/${playlistId}/`)) {
                            playlistDirSafeToDelete = false;
                        }
                    } else if (song.localUrl) {
                        try {
                            const parts = song.localUrl.split('/');
                            const fileName = parts[parts.length - 1];
                            const parentDirName = parts[parts.length - 2];
                            const targetDir = new Directory(downloadsDir, parentDirName);
                            new File(targetDir, fileName).delete();
                            const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
                            for (const ext of extensions) {
                                try { new File(targetDir, `${songId}_cover.${ext}`).delete(); } catch(e){}
                            }
                            const videoExts = ['mp4', 'webm', 'mov'];
                            for (const ext of videoExts) {
                                try { new File(targetDir, `${songId}_video.${ext}`).delete(); } catch(e){}
                            }
                        } catch(e) {}
                    }
                }

                if (playlistDirSafeToDelete && playlistDir.exists) {
                    playlistDir.delete();
                } else if (playlistDir.exists) {
                    try { new File(playlistDir, 'playlist_cover.jpg').delete(); } catch(e){}
                    try { new File(playlistDir, 'playlist_cover.png').delete(); } catch(e){}
                }

                delete meta.playlists[playlistId];
                delete meta.songs[playlistId];
                await saveMeta(meta);
            } catch (e) {
                console.log("Failed to clear playlist meta:", e);
            }
            resolve();
        });
    });
};

    // Delete the file only if not shared
    try {
        const meta = await getMeta();
        let isShared = false;
        for (const pId in meta.songs) {
            if (pId !== String(playlistId) && meta.songs[pId].find(s => (s.id || s._id) === songId)) {
                isShared = true;
                break;
            }
        }
        
        if (!isShared) {
            // Find where it's stored and delete it
            const song = (meta.songs[playlistId] || []).find(s => (s.id || s._id) === songId);
            const downloadsDir = new Directory(Paths.document, "downloads");
            let targetDir = new Directory(downloadsDir, String(playlistId));
            
            if (song && song.localUrl) {
                const parts = song.localUrl.split('/');
                const parentDirName = parts[parts.length - 2];
                targetDir = new Directory(downloadsDir, parentDirName);
            }
            
            const file = new File(targetDir, `${songId}.mp3`);
            if (file.exists) file.delete();
            const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
            for (const ext of extensions) {
                const coverFile = new File(targetDir, `${songId}_cover.${ext}`);
                if (coverFile.exists) { try { coverFile.delete(); } catch(e) {} }
            }
            const videoExtensions = ['mp4', 'webm', 'mov'];
            for (const ext of videoExtensions) {
                const videoFile = new File(targetDir, `${songId}_video.${ext}`);
                if (videoFile.exists) { try { videoFile.delete(); } catch(e) {} }
            }
        }
    } catch (e) {
        console.log("Failed to delete song file or cover:", e);
    }

    return new Promise(resolve => {
        metaMutex = metaMutex.then(async () => {
            try {
                const meta = await getMeta();
                let songs = meta.songs[playlistId] || [];
                const songIndex = songs.findIndex(s => (s.id || s._id) === songId);

                if (songIndex === -1) {
                    resolve();
                    return;
                }

                songs.splice(songIndex, 1);

                if (songs.length === 0) {
                    delete meta.playlists[playlistId];
                    delete meta.songs[playlistId];
                    try {
                        const downloadsDir = new Directory(Paths.document, "downloads");
                        const playlistDir = new Directory(downloadsDir, String(playlistId));
                        if (playlistDir.exists) {
                            playlistDir.delete();
                        }
                    } catch (e) {
                        console.log("Failed to delete empty playlist directory:", e);
                    }
                } else {
                    meta.songs[playlistId] = songs;
                    meta.playlists[playlistId].songCount = songs.length;
                    // Recalculate size
                    meta.playlists[playlistId].sizeBytes = songs.reduce(
                        (acc, s) => acc + (s.totalBytes || 0),
                        0
                    );
                }

                await saveMeta(meta);
            } catch (e) {
                console.log("Delete song error:", e);
            }
            resolve();
        });
    });
};

export const downloadSongToLocal = async (song, playlistId, downloadVideo = false) => {
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

        const taskKey = `${playlistId}:${songId}`;
        let downloadSuccess = true;

        if (needsAudio) {
            const ext = "mp3";
            const fileName = `${songId}.${ext}`;
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
                    const coverFileName = `${songId}_cover.${coverExt}`;
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
                const videoFileName = `${songId}_video.${videoExt}`;
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

        const legacyTaskKey = `download_task_${playlistId}:${songId}`;
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
export const downloadPlaylistSongs = async (
    playlist,
    songsToDownload,
    concurrency = 1,
    onProgress,
    downloadVideo = false
) => {
    if (typeof concurrency === 'function') {
        downloadVideo = typeof onProgress === 'boolean' ? onProgress : false;
        onProgress = concurrency;
        concurrency = 1;
    } else if (typeof onProgress === 'boolean') {
        downloadVideo = onProgress;
        onProgress = undefined;
    }

    let downloadedSongs = await getDownloadedSongs(playlist.id);

    let localPlaylistCover = playlist.cover;
    if (playlist.cover && !playlist.cover.startsWith("file://")) {
        try {
            const downloadsDir = new Directory(Paths.document, "downloads");
            const playlistDir = new Directory(downloadsDir, String(playlist.id));
            playlistDir.create({ idempotent: true, intermediates: true });
            
            let coverExt = "jpg";
            const urlParts = playlist.cover.split('?')[0].split('.');
            if (urlParts.length > 1) {
                const lastPart = urlParts[urlParts.length - 1];
                if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(lastPart.toLowerCase())) {
                    coverExt = lastPart.toLowerCase();
                }
            }
            const coverFileName = `playlist_cover.${coverExt}`;
            const coverFile = new File(playlistDir, coverFileName);
            
            if (!coverFile.exists) {
                const coverTask = File.createDownloadTask(playlist.cover, coverFile);
                await coverTask.downloadAsync();
            }
            localPlaylistCover = coverFile.uri;
        } catch (e) {
            console.log("Playlist cover download error:", e);
        }
    }

    await saveDownloadedPlaylist({
        id: playlist.id,
        name: playlist.name,
        cover: localPlaylistCover,
        songCount: downloadedSongs.length,
        sizeBytes: downloadedSongs.reduce(
            (acc, s) => acc + (s.totalBytes || 0),
            0
        )
    });

    const downloadingTasks = useDownloadStatus.getState().downloadTasks;
    const pendingSongs = songsToDownload.filter(
        song =>
            !downloadedSongs.find(
                s => (s.id || s._id) === (song.id || song._id)
            ) && !downloadingTasks[`${playlist.id}:${song.id || song._id}`]
    );
    if (pendingSongs.length > 0) {
        useDownloadStatus
            .getState()
            .setDownloadingPlaylist(playlist.id, pendingSongs);
    }

    let currentIndex = 0;
    let progressCount = 0;

    const worker = async () => {
        while (currentIndex < songsToDownload.length) {
            const index = currentIndex++;
            const song = songsToDownload[index];
            const songId = song.id || song._id;

            const isStillPending = useDownloadStatus.getState().downloadingPlaylists[playlist.id]?.find(s => (s.id || s._id) === songId);
            if (!isStillPending) {
                // The song was cancelled while queued!
                if (onProgress) {
                    progressCount++;
                    onProgress(progressCount, songsToDownload.length, 1);
                }
                continue;
            }

            const taskKey = `${playlist.id}:${songId}`;
            const isDownloading = !!useDownloadStatus.getState().downloadTasks[taskKey];
            if (downloadedSongs.find(s => (s.id || s._id) === songId) || isDownloading) {
                if (onProgress) {
                    progressCount++;
                    onProgress(progressCount, songsToDownload.length, 1);
                }
                continue;
            }

            useDownloadStatus.getState().setDownloadingSong(songId, "downloading");

            const downloadResult = await downloadSongToLocal(song, playlist.id, downloadVideo);

            useDownloadStatus.getState().removeDownloadingSong(songId);

            if (downloadResult && downloadResult.localUrl) {
                const { localUrl, localCoverUrl, localVideoUrl } = downloadResult;
                const progressData =
                    useDownloadStatus
                        .getState()
                        .downloadingPlaylists[
                            playlist.id
                        ]?.find(s => (s.id || s._id) === songId) || {};

                const songToSave = {
                    ...song,
                    localUrl,
                    isLocal: true,
                    url: localUrl,
                    totalBytes: progressData.totalBytes || 0
                };
                
                if (localCoverUrl) {
                    songToSave.cover = localCoverUrl;
                    songToSave.artwork = localCoverUrl;
                }
                
                if (localVideoUrl) {
                    songToSave.videoUrl = localVideoUrl;
                }

                await new Promise(resolve => {
                    metaMutex = metaMutex.then(async () => {
                        try {
                            const meta = await getMeta();
                            meta.songs[playlist.id] = meta.songs[playlist.id] || [];
                            if (!meta.songs[playlist.id].find(s => (s.id || s._id) === songId)) {
                                meta.songs[playlist.id].push(songToSave);
                                meta.playlists[playlist.id] = meta.playlists[playlist.id] || {};
                                meta.playlists[playlist.id].songCount = meta.songs[playlist.id].length;
                                meta.playlists[playlist.id].sizeBytes = meta.songs[playlist.id].reduce(
                                    (acc, s) => acc + (s.totalBytes || 0),
                                    0
                                );
                                await saveMeta(meta);
                                // Notify player to update its queue if it is currently playing this local playlist
                                const { usePlayer } = require("../../store/player.js");
                                if (usePlayer.getState().onLocalSongDownloaded) {
                                    usePlayer.getState().onLocalSongDownloaded();
                                }
                            }
                        } catch (err) {
                            console.log("Error saving meta:", err);
                        }
                        resolve();
                    });
                });
            }

            useDownloadStatus
                .getState()
                .removeDownloadingPlaylistSong(playlist.id, songId);

            if (onProgress) {
                progressCount++;
                onProgress(progressCount, songsToDownload.length, 1);
            }
        }
    };

    const workers = [];
    for (let i = 0; i < concurrency; i++) {
        workers.push(worker());
    }
    await Promise.all(workers);
};

export const getLocalUrlForSong = async (songId) => {
    const meta = await getMeta();
    for (const playlistId in meta.songs) {
        const songs = meta.songs[playlistId];
        const song = songs.find(s => (s.id || s._id) === songId);
        if (song && song.localUrl) {
            return song.localUrl;
        }
    }
    return null;
};

export const getLocalSongInfo = async (songId) => {
    const meta = await getMeta();
    for (const playlistId in meta.songs) {
        const songs = meta.songs[playlistId];
        const song = songs.find(s => (s.id || s._id) === songId);
        if (song && song.localUrl) {
            return {
                localUrl: song.localUrl,
                localVideoUrl: song.videoUrl && song.videoUrl.startsWith('file://') ? song.videoUrl : null
            };
        }
    }
    return null;
};
