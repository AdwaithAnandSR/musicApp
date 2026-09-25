const fs = require('fs');
let content = fs.readFileSync('src/store/player.js', 'utf8');

content = content.replace(
    /let trackUrl = track\.url;\s*\/\/ Check if there's a local downloaded version of this song\s*if \(\!track\.isLocal && \(track\._id \|\| track\.id\)\) \{\s*try \{\s*const \{ getLocalUrlForSong \} = require\("@services\/downloads\/downloadService"\);\s*const localUrl = await getLocalUrlForSong\(track\._id \|\| track\.id\);\s*if \(localUrl\) \{\s*trackUrl = localUrl;\s*\}\s*\} catch \(err\) \{\s*console\.log\("Error checking local version:", err\);\s*\}\s*\}/,
    `let trackUrl = track.url;
        let trackToUse = { ...track };

        // Check if there's a local downloaded version of this song
        if (!track.isLocal && (track._id || track.id)) {
            try {
                const { getLocalSongInfo } = require("@services/downloads/downloadService");
                const localInfo = await getLocalSongInfo(track._id || track.id);
                if (localInfo && localInfo.localUrl) {
                    trackUrl = localInfo.localUrl;
                    trackToUse.url = localInfo.localUrl;
                    trackToUse.isLocal = true;
                    if (localInfo.localVideoUrl) {
                        trackToUse.videoUrl = localInfo.localVideoUrl;
                    }
                }
            } catch (err) {
                console.log("Error checking local version:", err);
            }
        }`
);

// We also need to update the `set({ currentTrackIndex: index, currentTrackId: track._id || track.id, currentTrack: track });`
content = content.replace(
    /set\(\{ currentTrackIndex: index, currentTrackId: track\._id \|\| track\.id, currentTrack: track \}\);/,
    `set({ currentTrackIndex: index, currentTrackId: track._id || track.id, currentTrack: trackToUse });`
);

fs.writeFileSync('src/store/player.js', content, 'utf8');
