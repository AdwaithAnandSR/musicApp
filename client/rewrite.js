const fs = require('fs');

let content = fs.readFileSync('src/services/downloads/downloadService.js', 'utf8');

// We will update deleteDownloadedPlaylist, deleteDownloadedSong, and downloadSongToLocal

content = content.replace(
    /export const deleteDownloadedPlaylist = async playlistId => \{[\s\S]*?\/\/ 2\. Delete the entire local playlist directory[\s\S]*?\/\/ 3\. Clear state from storage[\s\S]*?return new Promise\(resolve => \{[\s\S]*?metaMutex = metaMutex\.then\(async \(\) => \{[\s\S]*?try \{[\s\S]*?const meta = await getMeta\(\);[\s\S]*?delete meta\.playlists\[playlistId\];[\s\S]*?delete meta\.songs\[playlistId\];[\s\S]*?await saveMeta\(meta\);[\s\S]*?\} catch \(e\) \{[\s\S]*?\}[\s\S]*?resolve\(\);[\s\S]*?\}\);[\s\S]*?\}\);[\s\S]*?\};/,
    `export const deleteDownloadedPlaylist = async playlistId => {
    // 1. Cancel active download tasks
    const pendingSongs =
        useDownloadStatus.getState().downloadingPlaylists[playlistId] || [];
    const allTasks = useDownloadStatus.getState().downloadTasks;

    for (const song of pendingSongs) {
        const songId = song.id || song._id;
        const taskKey = \`\${playlistId}:\${songId}\`;
        const task = allTasks[taskKey];
        if (task) {
            try {
                await task.cancelAsync();
            } catch (e) {
                console.log("Failed to cancel task:", e);
            }
        }
        useDownloadStatus.getState().removeDownloadingSong(songId);
        storage.delete(\`download_task_\${playlistId}:\${songId}\`);
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
                        if (song.localUrl && song.localUrl.includes(\`/\${playlistId}/\`)) {
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
                                try { new File(targetDir, \`\${songId}_cover.\${ext}\`).delete(); } catch(e){}
                            }
                            const videoExts = ['mp4', 'webm', 'mov'];
                            for (const ext of videoExts) {
                                try { new File(targetDir, \`\${songId}_video.\${ext}\`).delete(); } catch(e){}
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
};`
);

content = content.replace(
    /export const deleteDownloadedSong = async \(playlistId, songId\) => \{[\s\S]*?try \{[\s\S]*?const downloadsDir = new Directory\(Paths\.document, "downloads"\);[\s\S]*?const playlistDir = new Directory\(downloadsDir, String\(playlistId\)\);[\s\S]*?const file = new File\(playlistDir, `\$\{songId\}\.mp3`\);[\s\S]*?if \(file\.exists\) \{[\s\S]*?file\.delete\(\);[\s\S]*?\}[\s\S]*?const extensions = \['jpg', 'jpeg', 'png', 'webp', 'gif'\];[\s\S]*?for \(const ext of extensions\) \{[\s\S]*?const coverFile = new File\(playlistDir, `\$\{songId\}_cover\.\$\{ext\}`\);[\s\S]*?if \(coverFile\.exists\) \{[\s\S]*?try \{ coverFile\.delete\(\); \} catch\(e\) \{\}[\s\S]*?\}[\s\S]*?\}[\s\S]*?const videoExtensions = \['mp4', 'webm', 'mov'\];[\s\S]*?for \(const ext of videoExtensions\) \{[\s\S]*?const videoFile = new File\(playlistDir, `\$\{songId\}_video\.\$\{ext\}`\);[\s\S]*?if \(videoFile\.exists\) \{[\s\S]*?try \{ videoFile\.delete\(\); \} catch\(e\) \{\}[\s\S]*?\}[\s\S]*?\}[\s\S]*?\} catch \(e\) \{[\s\S]*?console\.log\("Failed to delete song file or cover:", e\);[\s\S]*?\}/,
    `    // Delete the file only if not shared
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
            
            const file = new File(targetDir, \`\${songId}.mp3\`);
            if (file.exists) file.delete();
            const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
            for (const ext of extensions) {
                const coverFile = new File(targetDir, \`\${songId}_cover.\${ext}\`);
                if (coverFile.exists) { try { coverFile.delete(); } catch(e) {} }
            }
            const videoExtensions = ['mp4', 'webm', 'mov'];
            for (const ext of videoExtensions) {
                const videoFile = new File(targetDir, \`\${songId}_video.\${ext}\`);
                if (videoFile.exists) { try { videoFile.delete(); } catch(e) {} }
            }
        }
    } catch (e) {
        console.log("Failed to delete song file or cover:", e);
    }`
);

fs.writeFileSync('src/services/downloads/downloadService.js', content, 'utf8');
