const fs = require('fs');

let content = fs.readFileSync('src/services/downloads/downloadService.js', 'utf8');

content = content.replace(
    /export const getLocalUrlForSong = async \(songId\) => \{[\s\S]*?return null;\n\};/,
    `export const getLocalUrlForSong = async (songId) => {
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
};`
);

fs.writeFileSync('src/services/downloads/downloadService.js', content, 'utf8');
