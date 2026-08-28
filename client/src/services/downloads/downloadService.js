import { File, Directory, Paths } from "expo-file-system";
import { MMKV } from "react-native-mmkv";
import { useDownloadStatus } from "../../store/appState.store.js";

const storage = new MMKV({ id: "downloads-storage" });

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
    const meta = await getMeta();
    meta.playlists[playlist.id] = {
        ...(meta.playlists[playlist.id] || {}),
        ...playlist
    };
    await saveMeta(meta);
};

export const deleteDownloadedPlaylist = async playlistId => {
    // 1. Cancel active download tasks
    const pendingSongs =
        useDownloadStatus.getState().downloadingPlaylists[playlistId] || [];
    const allTasks = useDownloadStatus.getState().downloadTasks;

    for (const song of pendingSongs) {
        const songId = song.id || song._id;
        const task = allTasks[songId];
        if (task) {
            try {
                await task.cancelAsync();
            } catch (e) {
                console.log("Failed to cancel task:", e);
            }
            useDownloadStatus.getState().removeDownloadingSong(songId);
        }
        storage.delete(`download_task_${playlistId}:${songId}`);
    }

    useDownloadStatus.setState(state => {
        const { [playlistId]: _, ...rest } = state.downloadingPlaylists;
        return { downloadingPlaylists: rest };
    });

    // 2. Delete the entire local playlist directory to ensure all files (including partials) are removed
    try {
        const downloadsDir = new Directory(Paths.document, "downloads");
        const playlistDir = new Directory(downloadsDir, String(playlistId));
        if (playlistDir.exists) {
            playlistDir.delete();
        }
    } catch (e) {
        console.log("Failed to delete playlist directory:", e);
    }

    // 3. Clear state from storage
    const meta = await getMeta();
    delete meta.playlists[playlistId];
    delete meta.songs[playlistId];
    await saveMeta(meta);
};

export const deleteDownloadedSong = async (playlistId, songId) => {
    // 1. Cancel active download task if it exists
    const task = useDownloadStatus.getState().downloadTasks[songId];
    if (task) {
        try {
            await task.cancelAsync();
        } catch (e) {
            console.log("Failed to cancel task:", e);
        }
        useDownloadStatus.getState().removeDownloadingSong(songId);
        useDownloadStatus
            .getState()
            .removeDownloadingPlaylistSong(playlistId, songId);
    }
    storage.delete(`download_task_${playlistId}:${songId}`);

    const meta = await getMeta();
    let songs = meta.songs[playlistId] || [];
    const songIndex = songs.findIndex(s => (s.id || s._id) === songId);

    if (songIndex === -1) return;

    const song = songs[songIndex];

    if (song.localUrl) {
        try {
            const file = new File(song.localUrl);
            if (file.exists) {
                file.delete();
            }
        } catch (e) {
            console.log("Failed to delete song file:", e);
        }
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
};

export const downloadSongToLocal = async (song, playlistId) => {
    try {
        if (!song.url) return null;

        const downloadsDir = new Directory(Paths.document, "downloads");
        const playlistDir = new Directory(downloadsDir, String(playlistId));

        playlistDir.create({
            idempotent: true,
            intermediates: true
        });

        const ext = "mp3";
        const songId = song.id || song._id;
        const fileName = `${songId}.${ext}`;
        const file = new File(playlistDir, fileName);

        if (file.exists) {
            return file.uri;
        }

        const onProgress = ({ bytesWritten, totalBytes }) => {
            let progress = 0;
            if (totalBytes > 0) {
                progress = bytesWritten / totalBytes;
            }
            useDownloadStatus
                .getState()
                .updateSongProgress(playlistId, songId, {
                    bytesWritten,
                    totalBytes,
                    progress,
                    status: "downloading"
                });
        };

        const task = File.createDownloadTask(song.url, file, {
            onProgress
        });

        useDownloadStatus.setState(state => ({
            downloadTasks: {
                ...state.downloadTasks,
                [songId]: task
            }
        }));

        try {
            await task.downloadAsync();
        } catch (err) {
            console.log("Task download error:", err);
        }

        // Clean up legacy task state if it exists
        const taskKey = `download_task_${playlistId}:${songId}`;

        storage.delete(taskKey);

        useDownloadStatus.setState(state => {
            const { [songId]: _, ...rest } = state.downloadTasks;
            return { downloadTasks: rest };
        });

        return file.uri;
    } catch (e) {
        console.log("Download error:", e, e?.message);
        return null;
    }
};

export const downloadPlaylistSongs = async (
    playlist,
    songsToDownload,
    onProgress
) => {
    let downloadedSongs = await getDownloadedSongs(playlist.id);

    await saveDownloadedPlaylist({
        id: playlist.id,
        name: playlist.name,
        cover: playlist.cover,
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
            ) && !downloadingTasks[song.id || song._id]
    );
    if (pendingSongs.length > 0) {
        useDownloadStatus
            .getState()
            .setDownloadingPlaylist(playlist.id, pendingSongs);
    }

    for (let i = 0; i < songsToDownload.length; i++) {
        const song = songsToDownload[i];

        const songId = song.id || song._id;

        /*
         * Already downloaded or currently downloading
         */
        const isDownloading = !!useDownloadStatus.getState().downloadTasks[songId];
        if (downloadedSongs.find(s => (s.id || s._id) === songId) || isDownloading) {
            if (onProgress) {
                onProgress(i + 1, songsToDownload.length, 1);
            }

            continue;
        }

        /*
         * Download
         */
        useDownloadStatus.getState().setDownloadingSong(songId, "downloading");

        const localUrl = await downloadSongToLocal(song, playlist.id);

        useDownloadStatus.getState().removeDownloadingSong(songId);

        if (localUrl) {
            // Retrieve progress data stored by updateSongProgress to get totalBytes
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

            downloadedSongs.push(songToSave);

            const meta = await getMeta();
            meta.songs[playlist.id] = downloadedSongs;
            meta.playlists[playlist.id].songCount = downloadedSongs.length;
            meta.playlists[playlist.id].sizeBytes = downloadedSongs.reduce(
                (acc, s) => acc + (s.totalBytes || 0),
                0
            );
            await saveMeta(meta);
        }

        useDownloadStatus
            .getState()
            .removeDownloadingPlaylistSong(playlist.id, songId);

        if (onProgress) {
            onProgress(i + 1, songsToDownload.length, 1);
        }
    }
};
